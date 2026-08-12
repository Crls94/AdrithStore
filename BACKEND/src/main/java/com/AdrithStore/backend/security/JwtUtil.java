package com.AdrithStore.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@Component
public class JwtUtil {

    private static final String PURPOSE_AUTH        = "auth";
    private static final String PURPOSE_PASSWORD_RESET = "pwd-reset";

    private final SecretKey key;
    private final long expirationMinutes;

    public JwtUtil(@Value("${app.jwt.secret}") String secret,
                   @Value("${app.jwt.expiration-minutes}") long expirationMinutes) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMinutes = expirationMinutes;
    }

    public String generarTokenAuth(Integer idUsuario, String username, String rol) {
        Instant ahora = Instant.now();
        return Jwts.builder()
            .subject(username)
            .claim("idUsuario", idUsuario)
            .claim("rol", rol)
            .claim("purpose", PURPOSE_AUTH)
            .issuedAt(Date.from(ahora))
            .expiration(Date.from(ahora.plusSeconds(expirationMinutes * 60)))
            .signWith(key)
            .compact();
    }

    // Token de un solo propósito para el flujo de recuperación de contraseña:
    // corta duración y un claim "purpose" distinto para que nunca sirva como token de sesión.
    public String generarTokenResetPassword(Integer idUsuario, String username) {
        Instant ahora = Instant.now();
        return Jwts.builder()
            .subject(username)
            .claim("idUsuario", idUsuario)
            .claim("purpose", PURPOSE_PASSWORD_RESET)
            .issuedAt(Date.from(ahora))
            .expiration(Date.from(ahora.plusSeconds(10 * 60)))
            .signWith(key)
            .compact();
    }

    public Claims parsearClaims(String token) throws JwtException {
        return Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    public AuthenticatedUser validarTokenAuth(String token) {
        Claims claims = parsearClaims(token);
        if (!PURPOSE_AUTH.equals(claims.get("purpose", String.class))) return null;
        Integer idUsuario = claims.get("idUsuario", Integer.class);
        String rol        = claims.get("rol", String.class);
        return new AuthenticatedUser(idUsuario, claims.getSubject(), rol);
    }

    // Devuelve el idUsuario si el token es un reset-token válido, no expirado y del propósito correcto.
    public Integer validarTokenResetPassword(String token) {
        Claims claims;
        try {
            claims = parsearClaims(token);
        } catch (JwtException e) {
            return null;
        }
        if (!PURPOSE_PASSWORD_RESET.equals(claims.get("purpose", String.class))) return null;
        return claims.get("idUsuario", Integer.class);
    }
}

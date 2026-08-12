package com.AdrithStore.backend.security;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

// Puebla el SecurityContext desde un Bearer token si viene y es valido.
// Si no viene o es invalido, simplemente deja pasar sin autenticar: es
// SecurityConfig (authorizeHttpRequests) quien decide si el endpoint exige login.
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    public JwtAuthFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                     @NonNull HttpServletResponse response,
                                     @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                AuthenticatedUser usuario = jwtUtil.validarTokenAuth(token);
                if (usuario != null) {
                    var authority = new SimpleGrantedAuthority("ROLE_" + usuario.rol());
                    var auth = new UsernamePasswordAuthenticationToken(usuario, null, List.of(authority));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            } catch (JwtException e) {
                // token invalido/expirado: seguimos sin autenticar, SecurityConfig decide el 401
            }
        }

        filterChain.doFilter(request, response);
    }
}

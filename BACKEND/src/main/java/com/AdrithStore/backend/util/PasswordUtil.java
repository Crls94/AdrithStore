package com.AdrithStore.backend.util;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Hash de contraseñas sin dependencia de Spring Security.
 * Usa SHA-256 con salt aleatorio. Compatible con BCrypt en migración futura.
 * Formato almacenado: SHA256:{salt_base64}:{hash_base64}
 */
public class PasswordUtil {

    private static final SecureRandom RANDOM = new SecureRandom();

    /** Genera el hash con salt para almacenar en BD */
    public static String hashear(String password) {
        byte[] salt = new byte[16];
        RANDOM.nextBytes(salt);
        byte[] hash = sha256(salt, password);
        return "SHA256:"
            + Base64.getEncoder().encodeToString(salt) + ":"
            + Base64.getEncoder().encodeToString(hash);
    }

    /** Verifica una contraseña contra el hash almacenado */
    public static boolean verificar(String password, String hashGuardado) {
        if (hashGuardado == null || !hashGuardado.startsWith("SHA256:")) return false;
        String[] partes = hashGuardado.split(":");
        if (partes.length != 3) return false;
        byte[] salt = Base64.getDecoder().decode(partes[1]);
        byte[] hashEsperado = Base64.getDecoder().decode(partes[2]);
        byte[] hashCalculado = sha256(salt, password);
        return MessageDigest.isEqual(hashCalculado, hashEsperado);
    }

    private static byte[] sha256(byte[] salt, String password) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(salt);
            return md.digest(password.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new RuntimeException("Error en SHA-256", e);
        }
    }
}
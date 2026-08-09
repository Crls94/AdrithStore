package com.AdrithStore.backend.controller;

import com.AdrithStore.backend.model.Usuario;
import com.AdrithStore.backend.repository.UsuarioRepository;
import com.AdrithStore.backend.repository.SistemaConfigRepository;
import com.AdrithStore.backend.repository.CuentaFinancieraRepository;
import com.AdrithStore.backend.security.JwtUtil;
import com.AdrithStore.backend.util.PasswordUtil;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UsuarioRepository          usuarioRepo;
    private final CuentaFinancieraRepository  cuentaRepo;
    private final SistemaConfigRepository     sistemaConfigRepo;
    private final JwtUtil                     jwtUtil;
    private final PasswordEncoder             passwordEncoder;

    // Los hashes viejos (pre-BCrypt) llevan el prefijo "SHA256:". Los nuevos son BCrypt puro.
    // En cuanto un usuario con hash viejo hace login exitoso, se re-hashea a BCrypt (migracion perezosa).
    private boolean verificarCredencial(String passwordPlano, String hashGuardado) {
        if (hashGuardado != null && hashGuardado.startsWith("SHA256:"))
            return PasswordUtil.verificar(passwordPlano, hashGuardado);
        return hashGuardado != null && passwordEncoder.matches(passwordPlano, hashGuardado);
    }

    
    @GetMapping("/estado")
    public Map<String, Object> estado() {
        boolean hayUsuarios = usuarioRepo.count() > 0;
        
        var cfg = sistemaConfigRepo.findById(1).orElse(null);
        boolean configurado  = cfg != null && Boolean.TRUE.equals(cfg.getConfigurado());
        String nombreNegocio = cfg != null && cfg.getNombreNegocio() != null
            ? cfg.getNombreNegocio() : "AdrithStore";
        java.util.Map<String,Object> res = new java.util.LinkedHashMap<>();
        res.put("hayUsuarios",  hayUsuarios);
        res.put("configurado",  configurado);
        res.put("nombreNegocio", nombreNegocio != null ? nombreNegocio : "AdrithStore");
        return res;
    }

    @GetMapping("/cuentas-setup")
    public List<?> cuentasSetup() {
        return cuentaRepo.findByActivaTrue();
    }

    
    @PostMapping("/primer-admin")
    public ResponseEntity<?> primerAdmin(@RequestBody PrimerAdminReq req) {
        if (usuarioRepo.count() > 0)
            return ResponseEntity.badRequest().body("Ya existe un administrador.");
        if (req.getUsername() == null || req.getUsername().isBlank())
            return ResponseEntity.badRequest().body("El usuario es obligatorio.");
        if (req.getPassword() == null || req.getPassword().length() < 6)
            return ResponseEntity.badRequest().body("La contraseña debe tener al menos 6 caracteres.");

        Usuario u = new Usuario();
        u.setUsername(req.getUsername().trim().toLowerCase());
        u.setNombres(req.getNombres());
        u.setApellidos(req.getApellidos());
        u.setDni(req.getDni());
        u.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        u.setRol("ADMIN");
        u.setActivo(true);
        usuarioRepo.save(u);
        return ResponseEntity.ok(Map.of("mensaje", "Administrador creado."));
    }

    
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginReq req) {
        Optional<Usuario> opt = usuarioRepo.findByUsername(req.getUsername().trim().toLowerCase());
        if (opt.isEmpty()) return ResponseEntity.status(401).body("Usuario o contraseña incorrectos.");

        Usuario u = opt.get();
        if (!Boolean.TRUE.equals(u.getActivo()))
            return ResponseEntity.status(403).body("Cuenta desactivada. Contacta al administrador.");
        
        if ("CLIENTE".equals(u.getRol()))
            return ResponseEntity.status(403).body("Los clientes no acceden al sistema. Consulta a tu administrador.");
        if (!verificarCredencial(req.getPassword(), u.getPasswordHash()))
            return ResponseEntity.status(401).body("Usuario o contraseña incorrectos.");

        if (u.getPasswordHash().startsWith("SHA256:")) {
            u.setPasswordHash(passwordEncoder.encode(req.getPassword()));
            usuarioRepo.save(u);
        }

        String token = jwtUtil.generarTokenAuth(u.getIdUsuario(), u.getUsername(), u.getRol());

        u.setPasswordHash("");
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("token", token);
        res.put("idUsuario", u.getIdUsuario());
        res.put("username", u.getUsername());
        res.put("rol", u.getRol());
        res.put("nombres", u.getNombres());
        res.put("apellidos", u.getApellidos());
        res.put("nombreCompleto", u.getNombreCompleto());
        res.put("dni", u.getDni());
        res.put("telefono", u.getTelefono());
        return ResponseEntity.ok(res);
    }

    
    
    @PostMapping("/recuperar/verificar")
    public ResponseEntity<?> verificarIdentidad(@RequestBody RecuperarVerifReq req) {
        if (req.getUsername() == null || req.getDni() == null || req.getTelefono() == null)
            return ResponseEntity.badRequest().body("Todos los campos son obligatorios.");

        Optional<Usuario> opt = usuarioRepo.findByUsername(req.getUsername().trim().toLowerCase());
        if (opt.isEmpty()) return ResponseEntity.status(404).body("No se encontró un usuario con esos datos.");

        Usuario u = opt.get();
        boolean dniOk      = req.getDni().trim().equals(u.getDni() != null ? u.getDni().trim() : "");
        boolean telOk      = req.getTelefono().trim().equals(u.getTelefono() != null ? u.getTelefono().trim() : "");

        if (!dniOk || !telOk)
            return ResponseEntity.status(404).body("Los datos no coinciden con ningún usuario registrado.");
        if (!Boolean.TRUE.equals(u.getActivo()))
            return ResponseEntity.status(403).body("Cuenta desactivada. Contacta al administrador.");


        String resetToken = jwtUtil.generarTokenResetPassword(u.getIdUsuario(), u.getUsername());
        return ResponseEntity.ok(Map.of(
            "resetToken", resetToken,
            "nombres",    u.getNombres()
        ));
    }

    @PostMapping("/recuperar/cambiar")
    public ResponseEntity<?> cambiarPassword(@RequestBody RecuperarCambiarReq req) {
        if (req.getResetToken() == null || req.getNuevaPassword() == null)
            return ResponseEntity.badRequest().body("Datos incompletos.");
        if (req.getNuevaPassword().length() < 6)
            return ResponseEntity.badRequest().body("La contraseña debe tener al menos 6 caracteres.");

        Integer idUsuario = jwtUtil.validarTokenResetPassword(req.getResetToken());
        if (idUsuario == null)
            return ResponseEntity.status(401).body("El enlace de recuperación es inválido o expiró. Vuelve a solicitarlo.");

        var opt = usuarioRepo.findById(idUsuario);
        if (opt.isEmpty()) return ResponseEntity.status(404).body("Usuario no encontrado.");
        var u = opt.get();
        u.setPasswordHash(passwordEncoder.encode(req.getNuevaPassword()));
        usuarioRepo.save(u);
        return ResponseEntity.ok(Map.of("mensaje", "Contraseña actualizada correctamente."));
    }

    
    @Data static class LoginReq         { private String username, password; }
    @Data static class PrimerAdminReq   { private String username, password, nombres, apellidos, dni; }
    @Data static class RecuperarVerifReq{ private String username, dni, telefono; }
    @Data static class RecuperarCambiarReq { private String resetToken; private String nuevaPassword; }
}
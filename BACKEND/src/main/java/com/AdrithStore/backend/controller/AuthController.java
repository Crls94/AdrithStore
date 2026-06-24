package com.AdrithStore.backend.controller;

import com.AdrithStore.backend.model.Usuario;
import com.AdrithStore.backend.repository.UsuarioRepository;
import com.AdrithStore.backend.repository.SistemaConfigRepository;
import com.AdrithStore.backend.repository.CuentaFinancieraRepository;
import com.AdrithStore.backend.util.PasswordUtil;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final UsuarioRepository          usuarioRepo;
    private final CuentaFinancieraRepository  cuentaRepo;
    private final SistemaConfigRepository     sistemaConfigRepo;

    // ── Estado del sistema ────────────────────────────────────────────────
    @GetMapping("/estado")
    public Map<String, Object> estado() {
        boolean hayUsuarios = usuarioRepo.count() > 0;
        // Leer configuración del sistema (tabla sistema_config, fila única id=1)
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

    // ── Primer admin ──────────────────────────────────────────────────────
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
        u.setPasswordHash(PasswordUtil.hashear(req.getPassword()));
        u.setRol("ADMIN");
        u.setActivo(true);
        usuarioRepo.save(u);
        return ResponseEntity.ok(Map.of("mensaje", "Administrador creado."));
    }

    // ── Login ─────────────────────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginReq req) {
        Optional<Usuario> opt = usuarioRepo.findByUsername(req.getUsername().trim().toLowerCase());
        if (opt.isEmpty()) return ResponseEntity.status(401).body("Usuario o contraseña incorrectos.");

        Usuario u = opt.get();
        if (!Boolean.TRUE.equals(u.getActivo()))
            return ResponseEntity.status(403).body("Cuenta desactivada. Contacta al administrador.");
        // Clientes no pueden iniciar sesión en el sistema POS
        if ("CLIENTE".equals(u.getRol()))
            return ResponseEntity.status(403).body("Los clientes no acceden al sistema. Consulta a tu administrador.");
        if (!PasswordUtil.verificar(req.getPassword(), u.getPasswordHash()))
            return ResponseEntity.status(401).body("Usuario o contraseña incorrectos.");

        u.setPasswordHash(""); // nunca enviamos el hash al frontend
        return ResponseEntity.ok(u);
    }

    // ── Recuperar contraseña ──────────────────────────────────────────────
    // Valida dni + telefono + username y si coinciden permite cambiar la clave
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

        // Devolvemos un token simple: idUsuario hasheado (para el siguiente paso)
        return ResponseEntity.ok(Map.of(
            "idUsuario", u.getIdUsuario(),
            "nombres",   u.getNombres()
        ));
    }

    @PostMapping("/recuperar/cambiar")
    public ResponseEntity<?> cambiarPassword(@RequestBody RecuperarCambiarReq req) {
        if (req.getIdUsuario() == null || req.getNuevaPassword() == null)
            return ResponseEntity.badRequest().body("Datos incompletos.");
        if (req.getNuevaPassword().length() < 6)
            return ResponseEntity.badRequest().body("La contraseña debe tener al menos 6 caracteres.");

        var opt = usuarioRepo.findById(req.getIdUsuario());
        if (opt.isEmpty()) return ResponseEntity.status(404).body("Usuario no encontrado.");
        var u = opt.get();
        u.setPasswordHash(PasswordUtil.hashear(req.getNuevaPassword()));
        usuarioRepo.save(u);
        return ResponseEntity.ok(Map.of("mensaje", "Contraseña actualizada correctamente."));
    }

    // ── DTOs ─────────────────────────────────────────────────────────────
    @Data static class LoginReq         { private String username, password; }
    @Data static class PrimerAdminReq   { private String username, password, nombres, apellidos, dni; }
    @Data static class RecuperarVerifReq{ private String username, dni, telefono; }
    @Data static class RecuperarCambiarReq { private Integer idUsuario; private String nuevaPassword; }
}
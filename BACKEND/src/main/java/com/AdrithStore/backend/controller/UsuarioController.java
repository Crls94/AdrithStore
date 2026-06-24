package com.AdrithStore.backend.controller;

import com.AdrithStore.backend.model.Usuario;
import com.AdrithStore.backend.repository.UsuarioRepository;
import com.AdrithStore.backend.util.PasswordUtil;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UsuarioController {

    private final UsuarioRepository usuarioRepo;

    @GetMapping
    public List<Usuario> listar() {
        return usuarioRepo.findAllByOrderByNombresAsc()
            .stream().peek(u -> u.setPasswordHash("")).toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Usuario> obtener(@PathVariable Integer id) {
        return usuarioRepo.findById(id).map(u -> {
            u.setPasswordHash(""); return ResponseEntity.ok(u);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> crear(@RequestBody UsuarioRequest req,
            @RequestHeader(value="X-Usuario", defaultValue="admin") String solicitante) {
        if (req.getUsername() == null || req.getUsername().isBlank())
            return ResponseEntity.badRequest().body("El nombre de usuario es obligatorio.");
        if (req.getPassword() == null || req.getPassword().length() < 6)
            return ResponseEntity.badRequest().body("La contrasena debe tener al menos 6 caracteres.");
        if (usuarioRepo.existsByUsername(req.getUsername().trim().toLowerCase()))
            return ResponseEntity.badRequest().body("El nombre de usuario ya existe.");
        if (req.getDni() != null && !req.getDni().isBlank() && usuarioRepo.existsByDni(req.getDni().trim()))
            return ResponseEntity.badRequest().body("El DNI ya esta registrado.");

        Usuario u = new Usuario();
        u.setUsername(req.getUsername().trim().toLowerCase());
        u.setPasswordHash(PasswordUtil.hashear(req.getPassword()));
        u.setRol(req.getRol() != null ? req.getRol() : "VENDEDOR");
        u.setNombres(req.getNombres().trim());
        u.setApellidos(req.getApellidos() != null ? req.getApellidos().trim() : "");
        u.setDni(req.getDni());
        u.setTelefono(req.getTelefono());
        u.setCreadoPor(solicitante);

        Usuario guardado = usuarioRepo.save(u);
        guardado.setPasswordHash("");
        return ResponseEntity.ok(guardado);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Integer id, @RequestBody UsuarioRequest req) {
        return usuarioRepo.findById(id).map(u -> {
            // Cambio de username — validar que no esté tomado por otro usuario
            if (req.getUsername() != null && !req.getUsername().isBlank()) {
                String nuevoUsername = req.getUsername().trim().toLowerCase();
                if (!nuevoUsername.equals(u.getUsername()) &&
                    usuarioRepo.existsByUsername(nuevoUsername))
                    return ResponseEntity.badRequest()
                        .body((Object) "El nombre de usuario '" + nuevoUsername + "' ya está en uso.");
                u.setUsername(nuevoUsername);
            }
            if (req.getNombres() != null)   u.setNombres(req.getNombres().trim());
            if (req.getApellidos() != null) u.setApellidos(req.getApellidos().trim());
            if (req.getTelefono() != null)  u.setTelefono(req.getTelefono());
            if (req.getDni() != null)       u.setDni(req.getDni().trim());
            if (req.getRol() != null && !req.getRol().isBlank()) u.setRol(req.getRol());
            Usuario g = usuarioRepo.save(u);
            g.setPasswordHash("");
            return ResponseEntity.ok(g);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/password")
    public ResponseEntity<?> cambiarPassword(@PathVariable Integer id,
            @RequestBody CambiarPasswordRequest req) {
        return usuarioRepo.findById(id).map(u -> {
            if (!PasswordUtil.verificar(req.getPasswordActual(), u.getPasswordHash()))
                return ResponseEntity.status(403).body((Object) "La contrasena actual es incorrecta.");
            if (req.getPasswordNueva() == null || req.getPasswordNueva().length() < 6)
                return ResponseEntity.badRequest().body((Object) "La nueva contrasena debe tener al menos 6 caracteres.");
            u.setPasswordHash(PasswordUtil.hashear(req.getPasswordNueva()));
            usuarioRepo.save(u);
            return ResponseEntity.ok((Object) Map.of("ok", true, "mensaje", "Contrasena actualizada."));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/reset-password")
    public ResponseEntity<?> resetPassword(@PathVariable Integer id,
            @RequestBody Map<String, String> req) {
        String nuevaPass = req.get("passwordNueva");
        if (nuevaPass == null || nuevaPass.length() < 6)
            return ResponseEntity.badRequest().body("Minimo 6 caracteres.");
        return usuarioRepo.findById(id).map(u -> {
            u.setPasswordHash(PasswordUtil.hashear(nuevaPass));
            usuarioRepo.save(u);
            return ResponseEntity.ok(Map.of("ok", true, "mensaje", "Contrasena restablecida."));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<?> cambiarEstado(@PathVariable Integer id,
            @RequestBody Map<String, Boolean> req) {
        Boolean activo = req.get("activo");
        if (activo == null) return ResponseEntity.badRequest().body("Campo 'activo' requerido.");
        return usuarioRepo.findById(id).map(u -> {
            u.setActivo(activo);
            usuarioRepo.save(u);
            return ResponseEntity.ok(Map.of("ok", true,
                "mensaje", "Cuenta " + (activo ? "activada" : "desactivada") + "."));
        }).orElse(ResponseEntity.notFound().build());
    }

    @Data public static class UsuarioRequest {
        private String username, password, rol, nombres, apellidos, dni, telefono;
    }

    @Data public static class CambiarPasswordRequest {
        private String passwordActual, passwordNueva;
    }
}
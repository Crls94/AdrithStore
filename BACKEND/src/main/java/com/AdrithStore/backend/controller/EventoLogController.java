package com.AdrithStore.backend.controller;

import com.AdrithStore.backend.model.EventoLog;
import com.AdrithStore.backend.repository.EventoLogRepository;
import com.AdrithStore.backend.service.LogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/eventos")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class EventoLogController {

    private final EventoLogRepository logRepo;
    private final LogService          logService;

    // ── GET /api/eventos ─────────────────────────────────────────────────
    @GetMapping
    public List<EventoLog> listar() {
        return logRepo.findTop100ByOrderByFechaDesc();
    }

    // ── GET /api/eventos/todos ────────────────────────────────────────────
    @GetMapping("/todos")
    public List<EventoLog> todos() {
        return logRepo.findAllByOrderByFechaDesc();
    }

    // ── POST /api/eventos/sistema-iniciado ────────────────────────────────
    // Llamado por el frontend después del setup para registrar el inicio
    @PostMapping("/sistema-iniciado")
    public ResponseEntity<?> sistemaIniciado(@RequestBody Map<String, String> req) {
        String nombre = req.getOrDefault("nombreNegocio", "AdrithStore");
        logService.log(
            "SISTEMA_INICIADO", "Sistema", 1,
            nombre + " — Sistema configurado e iniciado",
            "{\"nombreNegocio\":\"" + nombre + "\"}"
        );
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
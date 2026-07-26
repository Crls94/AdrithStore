package com.AdrithStore.backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.AdrithStore.backend.model.EventoLog;
import com.AdrithStore.backend.repository.EventoLogRepository;
import com.AdrithStore.backend.service.LogService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/eventos")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class EventoLogController {

    private final EventoLogRepository logRepo;
    private final LogService          logService;

    
    @GetMapping
    public List<EventoLog> listar() {
        return logRepo.findTop100ByOrderByFechaDesc();
    }

    
    @GetMapping("/todos")
    public List<EventoLog> todos() {
        return logRepo.findAllByOrderByFechaDesc();
    }

    
    
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
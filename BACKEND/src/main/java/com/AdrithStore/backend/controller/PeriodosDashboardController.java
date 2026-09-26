package com.AdrithStore.backend.controller;

import com.AdrithStore.backend.service.PeriodosDashboard;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class PeriodosDashboardController {
    private final PeriodosDashboard periodos;

    @GetMapping("/periodos")
    public Map<String, Object> opciones() {
        var opciones = periodos.opciones();
        return Map.of("zonaHoraria", PeriodosDashboard.ZONA.getId(),
                "predeterminado", opciones.getFirst().id(), "opciones", opciones);
    }
}

package com.AdrithStore.backend.infraestructura;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/infraestructura")
public class InfraestructuraController {
    private final MetricasInfraestructuraService service;
    public InfraestructuraController(MetricasInfraestructuraService service) { this.service = service; }
    @GetMapping("/metricas")
    public ResponseEntity<MetricasSnapshot> metricas(@RequestParam(defaultValue = "false") boolean incluirActividad) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.leer(incluirActividad));
    }
}

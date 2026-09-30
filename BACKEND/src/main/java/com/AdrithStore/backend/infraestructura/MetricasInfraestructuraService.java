package com.AdrithStore.backend.infraestructura;

import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.List;

@Service
public class MetricasInfraestructuraService {
    private final List<ProveedorMetricas> proveedores;
    public MetricasInfraestructuraService(List<ProveedorMetricas> proveedores) { this.proveedores = proveedores; }
    public MetricasSnapshot leer(boolean incluirActividad) {
        var secciones = proveedores.stream().flatMap(p -> p.leer(incluirActividad).stream()).toList();
        boolean parcial = secciones.stream().flatMap(s -> s.metricas().stream())
                .anyMatch(m -> m.estado() == MetricasSnapshot.Estado.NO_DISPONIBLE);
        return new MetricasSnapshot(Instant.now(), parcial ? "PARCIAL" : "DISPONIBLE", secciones);
    }
}

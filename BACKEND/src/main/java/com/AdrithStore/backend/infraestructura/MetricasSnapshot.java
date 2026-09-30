package com.AdrithStore.backend.infraestructura;

import java.time.Instant;
import java.util.List;

/** Contrato cerrado: no serializa tags, configuracion ni objetos internos del backend. */
public record MetricasSnapshot(Instant actualizadoEn, String estadoGeneral, List<Seccion> secciones) {
    public enum Estado { MEDIDO, ESTIMADO, NO_DISPONIBLE }
    public record Metrica(String id, String nombre, Double valor, String unidad, Estado estado, String detalle) {
        public static Metrica medida(String id, String nombre, double valor, String unidad, String detalle) {
            return Double.isFinite(valor) && valor >= 0
                    ? new Metrica(id, nombre, valor, unidad, Estado.MEDIDO, detalle)
                    : ausente(id, nombre, unidad, "El instrumento no proporciona una medicion valida.");
        }
        public static Metrica ausente(String id, String nombre, String unidad, String detalle) {
            return new Metrica(id, nombre, null, unidad, Estado.NO_DISPONIBLE, detalle);
        }
    }
    public record Seccion(String id, String nombre, List<Metrica> metricas) {}
}

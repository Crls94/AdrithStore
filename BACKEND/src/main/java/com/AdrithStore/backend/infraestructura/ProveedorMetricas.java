package com.AdrithStore.backend.infraestructura;

import java.util.List;

/** Un futuro proveedor Neon implementa este contrato sin cambiar controlador ni UI. */
public interface ProveedorMetricas {
    List<MetricasSnapshot.Seccion> leer(boolean incluirActividad);
}

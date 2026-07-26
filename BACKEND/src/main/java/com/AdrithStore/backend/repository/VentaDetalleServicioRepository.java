package com.AdrithStore.backend.repository;

import com.AdrithStore.backend.model.VentaDetalleServicio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface VentaDetalleServicioRepository extends JpaRepository<VentaDetalleServicio, Integer> {
    List<VentaDetalleServicio> findByVenta_IdVenta(Integer idVenta);

    // El monto de una transferencia (SERVICIO_COMIS) es un movimiento interno, no ingreso real —
    // solo la comisión lo es. Se usa para descontar el monto del total de ingresos del dashboard.
    @Query("""
        SELECT COALESCE(SUM(d.monto), 0) FROM VentaDetalleServicio d
        WHERE d.venta.fecha BETWEEN :desde AND :hasta
          AND d.venta.estado = 'confirmado'
          AND d.producto.tipo = 'SERVICIO_COMIS'
    """)
    BigDecimal sumMontoTransferenciasEntreFechas(
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);
}

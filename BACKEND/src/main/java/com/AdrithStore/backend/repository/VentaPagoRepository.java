package com.AdrithStore.backend.repository;

import com.AdrithStore.backend.model.VentaPago;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface VentaPagoRepository extends JpaRepository<VentaPago, Integer> {

    List<VentaPago> findByVenta_IdVenta(Integer idVenta);

    // Requerido por DashboardController.java:142
    @Query("""
        SELECT vp.medioPago, SUM(vp.monto)
        FROM VentaPago vp
        WHERE vp.venta.fecha BETWEEN :desde AND :hasta
          AND vp.venta.estado = 'confirmado'
        GROUP BY vp.medioPago
    """)
    List<Object[]> sumByMedioPagoEntreFechas(
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);
}
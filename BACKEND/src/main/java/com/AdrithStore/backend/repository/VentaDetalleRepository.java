package com.AdrithStore.backend.repository;

import com.AdrithStore.backend.model.VentaDetalle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface VentaDetalleRepository extends JpaRepository<VentaDetalle, Integer> {

    // Monto total (subtotal de líneas) de ventas confirmadas, agrupado por día.
    // Filtros opcionales por producto, categoría del producto y vendedor.
    // Cada fila: { java.sql.Date fecha, BigDecimal monto }
    @Query("""
        SELECT FUNCTION('date', v.fecha), COALESCE(SUM(d.subtotal), 0)
        FROM VentaDetalle d JOIN d.venta v
        WHERE v.fecha BETWEEN :desde AND :hasta
          AND v.estado = 'confirmado'
          AND (:idProducto  IS NULL OR d.producto.idProducto              = :idProducto)
          AND (:idCategoria IS NULL OR d.producto.categoria.idCategoria   = :idCategoria)
          AND (:idVendedor  IS NULL OR v.usuario.idUsuario                = :idVendedor)
        GROUP BY FUNCTION('date', v.fecha)
        ORDER BY FUNCTION('date', v.fecha)
    """)
    List<Object[]> heatmapPorDia(
            @Param("desde") LocalDateTime desde,
            @Param("hasta") LocalDateTime hasta,
            @Param("idProducto") Integer idProducto,
            @Param("idCategoria") Integer idCategoria,
            @Param("idVendedor") Integer idVendedor);
}

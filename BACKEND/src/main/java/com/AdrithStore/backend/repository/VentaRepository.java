package com.AdrithStore.backend.repository;

import com.AdrithStore.backend.model.Venta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface VentaRepository extends JpaRepository<Venta, Integer> {

    // Carga pagos y cliente con JOIN FETCH — evita LazyInitializationException
    @Query("SELECT DISTINCT v FROM Venta v LEFT JOIN FETCH v.pagos LEFT JOIN FETCH v.cliente LEFT JOIN FETCH v.usuario ORDER BY v.fecha DESC")
    List<Venta> findAllConPagosOrderByFechaDesc();

    default List<Venta> findAllByOrderByFechaDesc() {
        return findAllConPagosOrderByFechaDesc();
    }

    // Ventas por usuario (para dashboard vendedor)
     @Query("SELECT DISTINCT v FROM Venta v LEFT JOIN FETCH v.pagos LEFT JOIN FETCH v.cliente LEFT JOIN FETCH v.usuario WHERE v.usuario.idUsuario = :idUsuario ORDER BY v.fecha DESC")
    List<Venta> findByUsuario_IdUsuarioOrderByFechaDesc(@Param("idUsuario") Integer idUsuario);

    // Ventas por cliente (para historial en módulo clientes)
    List<Venta> findByCliente_IdClienteOrderByFechaDesc(Integer idCliente);

    // Para estadísticas del dashboard — ventas confirmadas en período
    @Query("SELECT v FROM Venta v WHERE v.fecha BETWEEN :desde AND :hasta AND v.estado = :estado")
    List<Venta> findByFechaBetweenAndEstado(
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta,
        @Param("estado") String estado);

    // Suma de costos del período (para margen)
    @Query("SELECT COALESCE(SUM(d.costoHistorico * d.cantidad), 0) FROM VentaDetalle d WHERE d.venta.fecha BETWEEN :desde AND :hasta AND d.venta.estado = 'confirmado'")
    java.math.BigDecimal sumCostosEntreFechas(
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);

    // Ventas confirmadas por usuario en período (para dashboard vendedor filtrado)
    @Query("SELECT v FROM Venta v WHERE v.usuario.idUsuario = :idUsuario AND v.fecha BETWEEN :desde AND :hasta AND v.estado = 'confirmado'")
    List<Venta> findByUsuarioAndFecha(
        @Param("idUsuario") Integer idUsuario,
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);
}
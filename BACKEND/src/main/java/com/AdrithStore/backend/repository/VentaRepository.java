package com.AdrithStore.backend.repository;

import com.AdrithStore.backend.model.Venta;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface VentaRepository extends JpaRepository<Venta, Integer> {

    
    @Query("SELECT DISTINCT v FROM Venta v LEFT JOIN FETCH v.pagos LEFT JOIN FETCH v.cliente LEFT JOIN FETCH v.usuario ORDER BY v.fecha DESC")
    List<Venta> findAllConPagosOrderByFechaDesc();

    default List<Venta> findAllByOrderByFechaDesc() {
        return findAllConPagosOrderByFechaDesc();
    }

    
     @Query("SELECT DISTINCT v FROM Venta v LEFT JOIN FETCH v.pagos LEFT JOIN FETCH v.cliente LEFT JOIN FETCH v.usuario WHERE v.usuario.idUsuario = :idUsuario ORDER BY v.fecha DESC")
    List<Venta> findByUsuario_IdUsuarioOrderByFechaDesc(@Param("idUsuario") Integer idUsuario);

    
    List<Venta> findByCliente_IdClienteOrderByFechaDesc(Integer idCliente);

    
    @Query("SELECT v FROM Venta v WHERE v.fecha BETWEEN :desde AND :hasta AND v.estado = :estado")
    List<Venta> findByFechaBetweenAndEstado(
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta,
        @Param("estado") String estado);

    
    @Query("SELECT COALESCE(SUM(d.costoHistorico * d.cantidad), 0) FROM VentaDetalle d WHERE d.venta.fecha BETWEEN :desde AND :hasta AND d.venta.estado = 'confirmado'")
    BigDecimal sumCostosEntreFechas(
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);

    
    @Query("SELECT v FROM Venta v WHERE v.usuario.idUsuario = :idUsuario AND v.fecha BETWEEN :desde AND :hasta AND v.estado = 'confirmado'")
    List<Venta> findByUsuarioAndFecha(
        @Param("idUsuario") Integer idUsuario,
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);

    

    
    @Query("""
        SELECT v FROM Venta v
        WHERE v.fecha BETWEEN :desde AND :hasta
          AND (:idCliente  IS NULL OR v.cliente.idCliente  = :idCliente)
          AND (:idVendedor IS NULL OR v.usuario.idUsuario   = :idVendedor)
          AND (:estado     IS NULL OR v.estado              = :estado)
    """)
    Page<Venta> buscarPaginado(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta,
                               @Param("idCliente") Integer idCliente, @Param("idVendedor") Integer idVendedor,
                               @Param("estado") String estado, Pageable pageable);

    @Query("""
        SELECT COALESCE(SUM(v.subtotal), 0)
        FROM Venta v
        WHERE v.fecha BETWEEN :desde AND :hasta
          AND (:idCliente  IS NULL OR v.cliente.idCliente  = :idCliente)
          AND (:idVendedor IS NULL OR v.usuario.idUsuario   = :idVendedor)
          AND (:estado     IS NULL OR v.estado              = :estado)
    """)
    BigDecimal sumSubtotal(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta,
                           @Param("idCliente") Integer idCliente, @Param("idVendedor") Integer idVendedor,
                           @Param("estado") String estado);

    @Query("""
        SELECT COALESCE(SUM(v.igv), 0)
        FROM Venta v
        WHERE v.fecha BETWEEN :desde AND :hasta
          AND (:idCliente  IS NULL OR v.cliente.idCliente  = :idCliente)
          AND (:idVendedor IS NULL OR v.usuario.idUsuario   = :idVendedor)
          AND (:estado     IS NULL OR v.estado              = :estado)
    """)
    BigDecimal sumIgv(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta,
                      @Param("idCliente") Integer idCliente, @Param("idVendedor") Integer idVendedor,
                      @Param("estado") String estado);

    @Query("""
        SELECT COALESCE(SUM(v.descuentoGlobal), 0)
        FROM Venta v
        WHERE v.fecha BETWEEN :desde AND :hasta
          AND (:idCliente  IS NULL OR v.cliente.idCliente  = :idCliente)
          AND (:idVendedor IS NULL OR v.usuario.idUsuario   = :idVendedor)
          AND (:estado     IS NULL OR v.estado              = :estado)
    """)
    BigDecimal sumDescuento(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta,
                            @Param("idCliente") Integer idCliente, @Param("idVendedor") Integer idVendedor,
                            @Param("estado") String estado);

    @Query("""
        SELECT COALESCE(SUM(v.total), 0)
        FROM Venta v
        WHERE v.fecha BETWEEN :desde AND :hasta
          AND (:idCliente  IS NULL OR v.cliente.idCliente  = :idCliente)
          AND (:idVendedor IS NULL OR v.usuario.idUsuario   = :idVendedor)
          AND (:estado     IS NULL OR v.estado              = :estado)
    """)
    BigDecimal sumTotal(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta,
                        @Param("idCliente") Integer idCliente, @Param("idVendedor") Integer idVendedor,
                        @Param("estado") String estado);
}
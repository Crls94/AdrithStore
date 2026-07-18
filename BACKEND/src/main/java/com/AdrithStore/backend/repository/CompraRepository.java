package com.AdrithStore.backend.repository;

import com.AdrithStore.backend.model.Compra;
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
public interface CompraRepository extends JpaRepository<Compra, Integer> {
    List<Compra> findAllByOrderByFechaDesc();
    List<Compra> findByEstadoOrderByFechaDesc(String estado);

    

    @Query("""
        SELECT c FROM Compra c
        WHERE c.fecha BETWEEN :desde AND :hasta
          AND (:idProveedor IS NULL OR c.proveedor.idProveedor = :idProveedor)
          AND (:estado     IS NULL OR c.estado              = :estado)
    """)
    Page<Compra> buscarPaginado(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta,
                                @Param("idProveedor") Integer idProveedor, @Param("estado") String estado,
                                Pageable pageable);

    @Query("""
        SELECT COALESCE(SUM(c.subtotal), 0)
        FROM Compra c
        WHERE c.fecha BETWEEN :desde AND :hasta
          AND (:idProveedor IS NULL OR c.proveedor.idProveedor = :idProveedor)
          AND (:estado     IS NULL OR c.estado              = :estado)
    """)
    BigDecimal sumSubtotal(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta,
                           @Param("idProveedor") Integer idProveedor, @Param("estado") String estado);

    @Query("""
        SELECT COALESCE(SUM(c.descuentoGlobal), 0)
        FROM Compra c
        WHERE c.fecha BETWEEN :desde AND :hasta
          AND (:idProveedor IS NULL OR c.proveedor.idProveedor = :idProveedor)
          AND (:estado     IS NULL OR c.estado              = :estado)
    """)
    BigDecimal sumDescuento(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta,
                            @Param("idProveedor") Integer idProveedor, @Param("estado") String estado);

    @Query("""
        SELECT COALESCE(SUM(c.percepcion), 0)
        FROM Compra c
        WHERE c.fecha BETWEEN :desde AND :hasta
          AND (:idProveedor IS NULL OR c.proveedor.idProveedor = :idProveedor)
          AND (:estado     IS NULL OR c.estado              = :estado)
    """)
    BigDecimal sumPercepcion(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta,
                             @Param("idProveedor") Integer idProveedor, @Param("estado") String estado);

    @Query("""
        SELECT COALESCE(SUM(c.total), 0)
        FROM Compra c
        WHERE c.fecha BETWEEN :desde AND :hasta
          AND (:idProveedor IS NULL OR c.proveedor.idProveedor = :idProveedor)
          AND (:estado     IS NULL OR c.estado              = :estado)
    """)
    BigDecimal sumTotal(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta,
                        @Param("idProveedor") Integer idProveedor, @Param("estado") String estado);
}
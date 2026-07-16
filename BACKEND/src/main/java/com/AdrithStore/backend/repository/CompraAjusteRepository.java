package com.AdrithStore.backend.repository;

import com.AdrithStore.backend.model.CompraAjuste;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CompraAjusteRepository extends JpaRepository<CompraAjuste, Integer> {
    List<CompraAjuste> findByCompraOriginal_IdCompraOrderByFechaDesc(Integer idCompra);
    List<CompraAjuste> findByProducto_IdProductoOrderByFechaDesc(Integer idProducto);

    // ── Reportes ───────────────────────────────────────────────────────────

    @Query("""
        SELECT a FROM CompraAjuste a
        WHERE a.fecha BETWEEN :desde AND :hasta
          AND (:tipo IS NULL OR a.tipo = :tipo)
        ORDER BY a.fecha DESC
    """)
    List<CompraAjuste> buscarPorRango(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta,
                                      @Param("tipo") String tipo);
}
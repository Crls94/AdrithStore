package com.AdrithStore.backend.repository;

import com.AdrithStore.backend.model.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProductoRepository extends JpaRepository<Producto, Integer> {

    // ── Métodos que ProductoController ya usa (NO QUITAR) ──────────────────

    List<Producto> findByVisibleEnPosTrue();

    List<Producto> findByTipo(String tipo);

    // Búsqueda por nombre o SKU
    List<Producto> findByNombreContainingIgnoreCaseOrSkuContainingIgnoreCase(
        String nombre, String sku);

    // Stock bajo: donde stock <= stock_alert (solo bienes físicos)
    @Query("""
        SELECT p FROM Producto p
        WHERE p.tipo = 'BIEN_FISICO'
          AND p.stock IS NOT NULL
          AND p.stockAlert IS NOT NULL
          AND p.stock <= p.stockAlert
        ORDER BY p.stock ASC
    """)
    List<Producto> findStockBajo();

    // Stock negativo
    List<Producto> findByStockLessThan(int cantidad);

    // ── Métodos que DashboardController usa ────────────────────────────────

    // Contar productos con stock bajo (para KPI del dashboard)
    @Query("""
        SELECT COUNT(p) FROM Producto p
        WHERE p.tipo = 'BIEN_FISICO'
          AND p.stock IS NOT NULL
          AND p.stockAlert IS NOT NULL
          AND p.stock <= p.stockAlert
    """)
    long countProductosStockBajo();
}
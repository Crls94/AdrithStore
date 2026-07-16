package com.AdrithStore.backend.repository;

import com.AdrithStore.backend.model.Proveedor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ProveedorRepository extends JpaRepository<Proveedor, Integer> {
    List<Proveedor> findByEmpresaContainingIgnoreCaseOrRucContaining(String empresa, String ruc);

    // ── Reportes ───────────────────────────────────────────────────────────

    @Query("""
        SELECT p, COUNT(c.idCompra), COALESCE(SUM(c.total), 0), MAX(c.fecha)
        FROM Proveedor p
        LEFT JOIN Compra c ON c.proveedor = p
          AND c.fecha BETWEEN :desde AND :hasta
          AND c.estado = 'confirmado'
        GROUP BY p
        ORDER BY p.empresa ASC
    """)
    List<Object[]> resumenPorProveedor(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);
}
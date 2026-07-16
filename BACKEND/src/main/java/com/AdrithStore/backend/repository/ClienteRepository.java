package com.AdrithStore.backend.repository;

import com.AdrithStore.backend.model.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ClienteRepository extends JpaRepository<Cliente, Integer> {
    List<Cliente> findByNombreContainingOrApellidoContainingOrDniContaining(
        String nombre, String apellido, String dni);

    // ── Reportes ───────────────────────────────────────────────────────────

    @Query("""
        SELECT c, COUNT(v.idVenta), COALESCE(SUM(v.total), 0), MAX(v.fecha)
        FROM Cliente c
        LEFT JOIN Venta v ON v.cliente = c
          AND v.fecha BETWEEN :desde AND :hasta
          AND v.estado = 'confirmado'
        GROUP BY c
        ORDER BY c.nombre ASC
    """)
    List<Object[]> resumenPorCliente(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);
}
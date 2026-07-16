package com.AdrithStore.backend.repository;
 
import com.AdrithStore.backend.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
 
@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {
 
    Optional<Usuario> findByUsername(String username);
 
    boolean existsByUsername(String username);
 
    boolean existsByDni(String dni);
 
    // Contar todos los usuarios (para detectar si es la primera vez)
    long count();
 
    List<Usuario> findByRolOrderByNombresAsc(String rol);
 
    List<Usuario> findAllByOrderByNombresAsc();

    // ── Reportes ───────────────────────────────────────────────────────────

    @Query("""
        SELECT u, COUNT(v.idVenta), COALESCE(SUM(v.total), 0)
        FROM Usuario u
        LEFT JOIN Venta v ON v.usuario = u
          AND v.fecha BETWEEN :desde AND :hasta
          AND v.estado = 'confirmado'
        GROUP BY u
        ORDER BY u.nombres ASC
    """)
    List<Object[]> resumenPorUsuario(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);
}
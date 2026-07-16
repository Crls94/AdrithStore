package com.AdrithStore.backend.repository;

import com.AdrithStore.backend.model.EventoLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EventoLogRepository extends JpaRepository<EventoLog, Integer> {

    // Requerido por EventoLogController.java:20
    List<EventoLog> findTop100ByOrderByFechaDesc();

    List<EventoLog> findAllByOrderByFechaDesc();

    List<EventoLog> findByTipoEventoOrderByFechaDesc(String tipoEvento);

    List<EventoLog> findByEntidadAndIdEntidadOrderByFechaDesc(String entidad, Integer idEntidad);

    // ── Reportes ───────────────────────────────────────────────────────────

    @Query("""
        SELECT e FROM EventoLog e
        WHERE (:desde IS NULL OR e.fecha >= :desde)
          AND (:hasta IS NULL OR e.fecha <= :hasta)
          AND (:tipoEvento IS NULL OR e.tipoEvento = :tipoEvento)
          AND (:entidad IS NULL OR e.entidad = :entidad)
    """)
    Page<EventoLog> buscarPaginado(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta,
                                   @Param("tipoEvento") String tipoEvento, @Param("entidad") String entidad,
                                   Pageable pageable);
}
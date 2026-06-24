package com.AdrithStore.backend.repository;

import com.AdrithStore.backend.model.EventoLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EventoLogRepository extends JpaRepository<EventoLog, Integer> {

    // Requerido por EventoLogController.java:20
    List<EventoLog> findTop100ByOrderByFechaDesc();

    List<EventoLog> findAllByOrderByFechaDesc();

    List<EventoLog> findByTipoEventoOrderByFechaDesc(String tipoEvento);

    List<EventoLog> findByEntidadAndIdEntidadOrderByFechaDesc(String entidad, Integer idEntidad);
}
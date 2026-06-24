package com.AdrithStore.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "evento_log")
public class EventoLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_evento")
    private Integer idEvento;

    @Column(name = "fecha")
    private LocalDateTime fecha = LocalDateTime.now();

    @Column(name = "tipo_evento", nullable = false, length = 60)
    private String tipoEvento;

    @Column(name = "entidad", length = 30)
    private String entidad;

    @Column(name = "id_entidad")
    private Integer idEntidad;

    @Column(name = "descripcion", columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "datos_json", columnDefinition = "TEXT")
    private String datosJson;
}
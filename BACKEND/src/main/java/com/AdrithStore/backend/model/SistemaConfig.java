package com.AdrithStore.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "sistema_config")
public class SistemaConfig {

    @Id
    @Column(name = "id")
    private Integer id = 1; // siempre 1 — tabla de fila única

    @Column(name = "configurado")
    private Boolean configurado = false;

    @Column(name = "nombre_negocio", length = 200)
    private String nombreNegocio;

    @Column(name = "fecha_setup")
    private LocalDateTime fechaSetup;
}
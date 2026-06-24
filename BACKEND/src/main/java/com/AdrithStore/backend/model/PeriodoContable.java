package com.AdrithStore.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "periodo_contable")
public class PeriodoContable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_periodo")
    private Integer idPeriodo;

    // Formato 'YYYY-MM'
    @Column(name = "periodo", unique = true, length = 7)
    private String periodo;

    @Column(name = "fecha_apertura")
    private LocalDateTime fechaApertura = LocalDateTime.now();

    // abierto | cerrado
    @Column(name = "estado", length = 20)
    private String estado = "abierto";

    @Column(name = "notas")
    private String notas;
}
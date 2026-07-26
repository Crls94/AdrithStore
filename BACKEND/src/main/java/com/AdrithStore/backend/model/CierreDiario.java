package com.AdrithStore.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "cierre_diario")
public class CierreDiario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_cierre")
    private Integer idCierre;

    @Column(name = "fecha_cierre", nullable = false)
    private LocalDate fechaCierre;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_cuenta", nullable = false)
    private CuentaFinanciera cuenta;

    @Column(name = "saldo_sistema", precision = 12, scale = 2, nullable = false)
    private BigDecimal saldoSistema;

    @Column(name = "saldo_contado", precision = 12, scale = 2, nullable = false)
    private BigDecimal saldoContado;

    @Column(name = "diferencia", precision = 12, scale = 2, nullable = false)
    private BigDecimal diferencia;

    @Column(name = "fondo_dejado", precision = 12, scale = 2, nullable = false)
    private BigDecimal fondoDejado;

    @Column(name = "retiro", precision = 12, scale = 2, nullable = false)
    private BigDecimal retiro;

    @Column(name = "ajuste_registrado")
    private Boolean ajusteRegistrado = false;

    @Column(name = "observacion")
    private String observacion;

    @Column(name = "cerrado_por", length = 50)
    private String cerradoPor;

    @Column(name = "cerrado_en")
    private LocalDateTime cerradoEn;

    @Column(name = "estado", length = 20)
    private String estado = "cerrado";
}

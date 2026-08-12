package com.AdrithStore.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

// No se confía dinero de un día para otro: no existe el concepto de "fondo" a
// dejar en caja. El cierre se reduce a comparar saldoSistema vs saldoContado;
// la diferencia se explica con "observacion" (texto libre). Las columnas
// fondo_dejado/retiro siguen en la BD (V2__quita_fondo_cierre_diario.sql solo
// les quitó el NOT NULL) por el historial de cierres viejos, pero ya no se
// mapean acá ni se completan en cierres nuevos.
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

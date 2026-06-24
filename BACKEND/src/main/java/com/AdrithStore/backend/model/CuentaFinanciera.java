package com.AdrithStore.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "cuenta_financiera")
public class CuentaFinanciera {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_cuenta")
    private Integer idCuenta;

    @Column(name = "nombre", nullable = false)
    private String nombre;

    // EFECTIVO | DIGITAL | BANCO
    @Column(name = "tipo", length = 20)
    private String tipo;

    @Column(name = "descripcion")
    private String descripcion;

    @Column(name = "saldo_actual", precision = 12, scale = 2)
    private BigDecimal saldoActual = BigDecimal.ZERO;

    @Column(name = "activa")
    private Boolean activa = true;
}
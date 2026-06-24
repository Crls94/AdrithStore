package com.AdrithStore.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "transaccion_financiera")
public class TransaccionFinanciera {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_transaccion")
    private Integer idTransaccion;

    @Column(name = "fecha")
    private LocalDateTime fecha = LocalDateTime.now();

    // APERTURA | VENTA | COMPRA | GASTO | CAMBIO_DIGITAL | AJUSTE | TRANSFERENCIA
    @Column(name = "tipo_mov", length = 30)
    private String tipoMov;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_cuenta")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private CuentaFinanciera cuenta;

    @Column(name = "monto", precision = 10, scale = 2)
    private BigDecimal monto;

    // +1 = entrada, -1 = salida
    @Column(name = "signo")
    private Integer signo;

    @Column(name = "concepto")
    private String concepto;

    // FK opcionales a Venta y Compra (solo el ID para evitar carga lazy)
    @Column(name = "id_venta")
    private Integer idVenta;

    @Column(name = "id_compra")
    private Integer idCompra;

    // 'YYYY-MM' para filtrar por mes
    @Column(name = "periodo", length = 7)
    private String periodo;

    @Column(name = "creada_por", length = 50)
    private String creadaPor;

    public BigDecimal montoNeto() {
        if (monto == null || signo == null) return BigDecimal.ZERO;
        return monto.multiply(BigDecimal.valueOf(signo));
    }
}
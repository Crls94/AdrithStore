package com.AdrithStore.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "venta_pago")
public class VentaPago {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_pago")
    private Integer idPago;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_venta", nullable = false)
    private Venta venta;

    @Column(name = "medio_pago", nullable = false, length = 50)
    private String medioPago;  // efectivo | plin | yape | tarjeta | transferencia

    @Column(name = "monto", nullable = false, precision = 10, scale = 2)
    private BigDecimal monto;
}
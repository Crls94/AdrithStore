package com.AdrithStore.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "venta_detalle")
public class VentaDetalle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_venta_detalle")
    private Integer idVentaDetalle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_venta")
    @JsonIgnoreProperties({"detalles","pagos","hibernateLazyInitializer"})
    private Venta venta;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_producto")
    @JsonIgnoreProperties({"hibernateLazyInitializer","handler"})
    private Producto producto;

    @Column(name = "cantidad")          private Integer cantidad;
    @Column(name = "precio_historico",  precision = 10, scale = 2) private BigDecimal precioHistorico;
    @Column(name = "costo_historico",   precision = 10, scale = 4) private BigDecimal costoHistorico;
    // descuento por ítem: monto fijo descontado del precio (ej: 0.20 sobre un ítem de 0.20)
    @Column(name = "descuento_item",    precision = 10, scale = 2) private BigDecimal descuentoItem = BigDecimal.ZERO;
    @Column(name = "subtotal",          precision = 10, scale = 2) private BigDecimal subtotal;
}
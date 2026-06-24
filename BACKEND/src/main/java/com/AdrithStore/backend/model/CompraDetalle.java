package com.AdrithStore.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Entity
@Table(name = "compra_detalle")
public class CompraDetalle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_compra_detalle")
    private Integer idCompraDetalle;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_compra")
    private Compra compra;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_producto")
    @JsonIgnoreProperties({"unidades","categoria"})
    private Producto producto;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_unidad")
    private ProductoUnidad unidad;

    @Column(name = "cantidad")
    private Integer cantidad;

    @Column(name = "costo_unitario", precision = 10, scale = 4)
    private BigDecimal costoUnitario;

    // CPP del producto ANTES de esta compra (para auditoría y ajustes)
    @Column(name = "costo_anterior", precision = 10, scale = 4)
    private BigDecimal costoAnterior;

    @Column(name = "descuento_pct", precision = 5, scale = 2)
    private BigDecimal descuentoPct = BigDecimal.ZERO;

    @Column(name = "subtotal", precision = 10, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "vencimiento")
    private LocalDate vencimiento;
}
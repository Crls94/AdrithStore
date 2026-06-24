package com.AdrithStore.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Entity
@Table(name = "compra")
public class Compra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_compra")
    private Integer idCompra;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_proveedor")
    private Proveedor proveedor;

    @Column(name = "tipo_comprobante")
    private String tipoComprobante;

    @Column(name = "serie_comprobante")
    private String serieComprobante;

    @Column(name = "fecha")
    private LocalDateTime fecha;

    // confirmado | anulado | borrador
    @Column(name = "estado")
    private String estado = "confirmado";

    @Column(name = "motivo")
    private String motivo;

    @Column(name = "subtotal", precision = 10, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(name = "descuento_global", precision = 10, scale = 2)
    private BigDecimal descuentoGlobal = BigDecimal.ZERO;

    @Column(name = "percepcion", precision = 10, scale = 2)
    private BigDecimal percepcion = BigDecimal.ZERO;

    @Column(name = "total", precision = 10, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @OneToMany(mappedBy = "compra", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JsonIgnoreProperties("compra")
    private List<CompraDetalle> detalles;
}
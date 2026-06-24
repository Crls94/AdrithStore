package com.AdrithStore.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Data
@Entity
@Table(name = "producto")
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_producto")
    private Integer idProducto;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_categoria")
    private Categoria categoria;

    @Column(name = "sku", unique = true)
    private String sku;

    @Column(name = "nombre", nullable = false)
    private String nombre;

    @Column(name = "descripcion")
    private String descripcion;

    // Tipo de producto: BIEN_FISICO | SERVICIO_PURO | SERVICIO_COMIS | CONSUMIBLE
    @Column(name = "tipo", length = 20)
    private String tipo = "BIEN_FISICO";

    // Si false, no aparece en el POS de ventas (CONSUMIBLES)
    @Column(name = "visible_en_pos")
    private Boolean visibleEnPos = true;

    @Column(name = "stock")
    private Integer stock = 0;

    @Column(name = "precio_costo", precision = 10, scale = 4)
    private BigDecimal precioCosto = BigDecimal.ZERO;

    @Column(name = "precio_venta", precision = 10, scale = 2)
    private BigDecimal precioVenta = BigDecimal.ZERO;

    // Solo para SERVICIO_COMIS: S/1 por cada S/100
    @Column(name = "comision_base", precision = 10, scale = 2)
    private BigDecimal comisionBase;

    @Column(name = "comision_cada", precision = 10, scale = 2)
    private BigDecimal comisionCada;

    @Column(name = "stock_alert")
    private Integer stockAlert = 5;

    @Column(name = "cpp", precision = 10, scale = 4)
    private BigDecimal cpp = BigDecimal.ZERO;

    @Column(name = "permite_stock_negativo")
    private Boolean permiteStockNegativo = true;

    @Column(name = "imagen_url")
    private String imagenUrl;

    @JsonIgnore
    @OneToMany(mappedBy = "producto", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<ProductoUnidad> unidades;

    // ── Helpers de tipo ───────────────────────────────────────────────────
    public boolean esBienFisico()    { return "BIEN_FISICO".equals(tipo);    }
    public boolean esServicioPuro()  { return "SERVICIO_PURO".equals(tipo);  }
    public boolean esServicioComis() { return "SERVICIO_COMIS".equals(tipo); }
    public boolean esConsumible()    { return "CONSUMIBLE".equals(tipo);     }

    // Calcular comisión sugerida para SERVICIO_COMIS
    public BigDecimal calcularComisionSugerida(BigDecimal montoOperacion) {
        if (comisionBase == null || comisionCada == null
                || comisionCada.compareTo(BigDecimal.ZERO) == 0
                || montoOperacion == null) {
            return precioVenta;
        }
        return comisionBase.multiply(
            montoOperacion.divide(comisionCada, 4, RoundingMode.FLOOR)
        ).setScale(2, RoundingMode.HALF_UP);
    }
}
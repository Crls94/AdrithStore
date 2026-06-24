package com.AdrithStore.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "producto_unidad",
       uniqueConstraints = @UniqueConstraint(columnNames = {"id_producto", "nombre_unidad"}))
public class ProductoUnidad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_unidad")
    private Integer idUnidad;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_producto", nullable = false)
    private Producto producto;

    @Column(name = "nombre_unidad", nullable = false)
    private String nombreUnidad;   // "Unidad", "Docena", "Caja x24"

    @Column(name = "unidad", nullable = false)
    private Integer unidad;        // factor: 1, 12, 24...

    @Column(name = "medida")
    private String medida;         // "U", "Caj", "Bot"...

    @Column(name = "precio_venta", precision = 10, scale = 2)
    private BigDecimal precioVenta;
}
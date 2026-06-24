package com.AdrithStore.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "compra_ajuste")
public class CompraAjuste {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_ajuste")
    private Integer idAjuste;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_compra_original")
    @JsonIgnoreProperties("detalles")
    private Compra compraOriginal;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_producto")
    @JsonIgnoreProperties("unidades")
    private Producto producto;

    @Column(name = "fecha")
    private LocalDateTime fecha;

    // COSTO | CANTIDAD | DEVOLUCION
    @Column(name = "tipo", nullable = false)
    private String tipo;

    @Column(name = "motivo", nullable = false)
    private String motivo;

    @Column(name = "delta_cantidad")
    private Integer deltaCantidad = 0;

    @Column(name = "costo_anterior", precision = 10, scale = 4)
    private BigDecimal costoAnterior;

    @Column(name = "costo_nuevo", precision = 10, scale = 4)
    private BigDecimal costoNuevo;

    @Column(name = "cpp_resultante", precision = 10, scale = 4)
    private BigDecimal cppResultante;

    @Column(name = "impacto_stock")
    private Integer impactoStock = 0;
}
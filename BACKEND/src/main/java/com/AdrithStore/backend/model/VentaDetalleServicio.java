package com.AdrithStore.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@Entity
@Table(name = "venta_detalle_servicio")
public class VentaDetalleServicio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_venta_detalle_servicio")
    private Integer idVentaDetalleServicio;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_venta")
    @JsonIgnoreProperties({"detallesServicio","pagos","hibernateLazyInitializer"})
    private Venta venta;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_producto")
    private Producto producto;

    @Column(name = "descripcion")
    private String descripcion;

    @Column(name = "monto", precision = 10, scale = 2)
    private BigDecimal monto = BigDecimal.ZERO;

    @Column(name = "costo", precision = 10, scale = 4)
    private BigDecimal costo = BigDecimal.ZERO;

    @Column(name = "comision", precision = 10, scale = 2)
    private BigDecimal comision = BigDecimal.ZERO;

    @Column(name = "origen")
    private String origen;

    @Column(name = "destino")
    private String destino;

    @Column(name = "subtotal", precision = 10, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;
}

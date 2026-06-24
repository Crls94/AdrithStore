package com.AdrithStore.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Entity
@Table(name = "venta")
public class Venta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_venta")
    private Integer idVenta;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_cliente")
    @JsonIgnoreProperties({"hibernateLazyInitializer","handler"})
    private Cliente cliente;

    // Usuario que registró la venta — requerido desde ahora
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_usuario")
    @JsonIgnoreProperties({"passwordHash","hibernateLazyInitializer","handler"})
    private Usuario usuario;

    @Column(name = "tipo_comprobante")  private String tipoComprobante;
    @Column(name = "serie_comprobante") private String serieComprobante;
    @Column(name = "fecha")             private LocalDateTime fecha;
    @Column(name = "medio_pago")        private String medioPago;
    @Column(name = "estado")            private String estado = "confirmado";
    @Column(name = "motivo")            private String motivo;

    @Column(name = "subtotal",         precision = 10, scale = 2) private BigDecimal subtotal;
    @Column(name = "igv",              precision = 10, scale = 2) private BigDecimal igv;
    @Column(name = "descuento_global", precision = 10, scale = 2) private BigDecimal descuentoGlobal = BigDecimal.ZERO;
    @Column(name = "total",            precision = 10, scale = 2) private BigDecimal total;

    @OneToMany(mappedBy = "venta", cascade = CascadeType.ALL,
               fetch = FetchType.EAGER, orphanRemoval = true)
    @JsonIgnoreProperties({"venta","hibernateLazyInitializer"})
    private List<VentaDetalle> detalles = new ArrayList<>();

    @OneToMany(mappedBy = "venta", cascade = CascadeType.ALL,
               fetch = FetchType.LAZY, orphanRemoval = true)
    @JsonIgnoreProperties({"venta","hibernateLazyInitializer"})
    private List<VentaPago> pagos = new ArrayList<>();
}
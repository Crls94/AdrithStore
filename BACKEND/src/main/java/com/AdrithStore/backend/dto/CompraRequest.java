package com.AdrithStore.backend.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class CompraRequest {

    private Integer       idProveedor;
    private String        tipoComprobante;
    private String        serieComprobante;
    private BigDecimal    percepcion;
    private BigDecimal    descuentoGlobal;

    // Fecha real de ingreso al almacén (si null → se usa ahora)
    private LocalDateTime fechaIngreso;

    private List<DetalleItem> detalles;

    @Data
    public static class DetalleItem {
        private Integer    idProducto;
        private Integer    cantidad;
        private BigDecimal costoUnitario;  // calculado por frontend: costoTotal / cantidad
        private BigDecimal precioVenta;    // precio al cliente (opcional, actualiza el producto)
        private Integer    idUnidad;
        private BigDecimal descuentoPct;
        private LocalDate  vencimiento;

        // ── Bonificación MISMO producto ──────────────────────────
        // "Compré 12, me regalaron 2 → pago total de 12 se divide entre 14 unidades"
        private Integer    unidadesBonificacion;  // unidades extra recibidas gratis

        // ── Bonificación producto DISTINTO ───────────────────────
        // "Por comprar X me regalaron Y → distribuir costo entre ambos"
        private Integer    idProductoBonif;       // id del producto regalado
        private Integer    cantidadBonif;         // unidades del producto regalado
        private BigDecimal costoBonifTotal;       // costo total a distribuir al regalo (si es null usa CPP)
    }
}
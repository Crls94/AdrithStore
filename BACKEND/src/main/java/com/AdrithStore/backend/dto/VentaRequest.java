package com.AdrithStore.backend.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class VentaRequest {

    private Integer idCliente;
    private String  tipoComprobante;
    private String  serieComprobante;

    // Legado: si no vienen pagos[], se usa este campo con el total completo
    private String  medioPago;

    private List<DetalleItem> detalles;

    // Nuevo: múltiples medios de pago
    private List<PagoItem> pagos;

    @Data
    public static class DetalleItem {
        private Integer idProducto;
        private Integer cantidad;
        private Integer idUnidad;   // opcional: presentación (docena, caja...)
    }

    @Data
    public static class PagoItem {
        private String     medioPago;
        private BigDecimal monto;
    }
}
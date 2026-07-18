package com.AdrithStore.backend.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class VentaRequest {

    private Integer idCliente;
    private String  tipoComprobante;
    private String  serieComprobante;

    
    private String  medioPago;

    private List<DetalleItem> detalles;

    
    private List<PagoItem> pagos;

    @Data
    public static class DetalleItem {
        private Integer idProducto;
        private Integer cantidad;
        private Integer idUnidad;   
    }

    @Data
    public static class PagoItem {
        private String     medioPago;
        private BigDecimal monto;
    }
}
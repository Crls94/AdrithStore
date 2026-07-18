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

    
    private LocalDateTime fechaIngreso;

    private List<DetalleItem> detalles;

    @Data
    public static class DetalleItem {
        private Integer    idProducto;
        private Integer    cantidad;
        private BigDecimal costoUnitario;  
        private BigDecimal precioVenta;    
        private Integer    idUnidad;
        private BigDecimal descuentoPct;
        private LocalDate  vencimiento;

        
        
        private Integer    unidadesBonificacion;  

        
        
        private Integer    idProductoBonif;       
        private Integer    cantidadBonif;         
        private BigDecimal costoBonifTotal;       
    }
}
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
    // null: compatibilidad con clientes anteriores (importe positivo activa el 2%).
    private Boolean       aplicaPercepcion;
    private BigDecimal    descuentoGlobal;
    private String        medioPago;

    
    private LocalDateTime fechaIngreso;

    private List<DetalleItem> detalles;

    @Data
    public static class DetalleItem {
        private Integer    idProducto;
        private BigDecimal cantidad;
        private BigDecimal costoUnitario;
        // Bruto de línea opcional: evita perder centavos al dividir total/cantidad.
        private BigDecimal costoTotal;
        private BigDecimal precioVenta;
        private Integer    idUnidad;
        private BigDecimal descuentoPct;
        private LocalDate  vencimiento;



        private BigDecimal unidadesBonificacion;



        private Integer    idProductoBonif;
        private BigDecimal cantidadBonif;
        // Deprecado: la bonificación de producto distinto aumenta stock y conserva su CPP
        // (#7/#9). Este campo se ignora por compatibilidad con clientes antiguos y no debe
        // volver a asignar valor monetario a la bonificación.
        @Deprecated
        private BigDecimal costoBonifTotal;
    }
}

package com.AdrithStore.backend.enums;

/**
 * Tipo de producto/ítem en el catálogo.
 * Mapeado a VARCHAR(20) en BD con @Enumerated(EnumType.STRING).
 * El CHECK CONSTRAINT en PostgreSQL garantiza integridad adicional.
 */
public enum TipoProducto {

    /** Mercadería física con stock, CPP y control de inventario estricto. */
    BIEN_FISICO,

    /**
     * Servicio producido en el momento (fotocopias, tipeos, anillados).
     * Sin stock. Costo calculado sobre insumos. Costo > 0 requerido.
     * Visible en POS.
     */
    SERVICIO_PURO,

    /**
     * Servicio de intermediación financiera (cambio Plin, transferencias).
     * Sin stock. Costo dinámico = monto entregado al cliente (guardado
     * en VentaDetalle.montoOperacion, NO en Producto.precioCosto).
     * Precio_Venta = comisión cobrada (puede variar con descuento).
     * Genera 2 transacciones financieras automáticamente.
     * Visible en POS.
     */
    SERVICIO_COMIS,

    /**
     * Insumo interno, no se vende directamente en el POS.
     * Permite costo = 0 solo en caso de reciclaje/descarte (ítem B separado).
     * Visible_En_Pos = false.
     * Aparece en reportes de consumo interno.
     */
    CONSUMIBLE
}
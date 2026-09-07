package com.AdrithStore.backend.service;

import com.AdrithStore.backend.dto.CompraRequest;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/** Cálculo puro compartido por la previsualización y la confirmación de compras. */
public final class CalculoCompra {
    private static final BigDecimal TASA = new BigDecimal("0.02");
    private CalculoCompra() {}

    public record Linea(BigDecimal bruto, BigDecimal descuento, BigDecimal neto,
                        BigDecimal percepcion, BigDecimal percepcionVisible,
                        BigDecimal valorizado, BigDecimal cantidadTotal, BigDecimal costoUnitario) {}
    public record Resultado(List<Linea> lineas, BigDecimal subtotalNeto,
                            BigDecimal percepcionCalculada, BigDecimal percepcionIngresada,
                            BigDecimal diferencia, BigDecimal totalTesoreria) {}

    public static BigDecimal moneda(BigDecimal n) { return n.setScale(2, RoundingMode.HALF_UP); }
    private static BigDecimal cero(BigDecimal n) { return n == null ? BigDecimal.ZERO : n; }
    private static void exigir(boolean cumple, String error) {
        if (!cumple) throw new IllegalArgumentException(error);
    }

    public static Resultado calcular(CompraRequest req) {
        exigir(req != null && req.getDetalles() != null && !req.getDetalles().isEmpty(),
            "Agrega al menos un producto.");
        BigDecimal ingresada = cero(req.getPercepcion());
        BigDecimal global = cero(req.getDescuentoGlobal());
        exigir(ingresada.signum() >= 0 && global.signum() >= 0,
            "Percepción y descuento global no pueden ser negativos.");
        boolean activa = req.getAplicaPercepcion() != null
            ? req.getAplicaPercepcion() : ingresada.signum() > 0;
        List<Linea> lineas = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal percepcionAcumulada = BigDecimal.ZERO;
        for (CompraRequest.DetalleItem item : req.getDetalles()) {
            exigir(item != null && item.getIdProducto() != null, "Producto requerido en cada línea.");
            exigir(item.getCantidad() != null && item.getCantidad().signum() > 0,
                "La cantidad comprada debe ser mayor a cero.");
            BigDecimal cantidad = item.getCantidad();
            BigDecimal bruto = item.getCostoTotal();
            if (bruto == null) {
                exigir(item.getCostoUnitario() != null && item.getCostoUnitario().signum() > 0,
                    "El costo unitario debe ser mayor a cero.");
                bruto = item.getCostoUnitario().multiply(cantidad);
            }
            exigir(bruto.signum() > 0, "El costo bruto de línea debe ser mayor a cero.");
            BigDecimal pct = cero(item.getDescuentoPct());
            exigir(pct.signum() >= 0 && pct.compareTo(new BigDecimal("100")) <= 0,
                "El descuento de línea debe estar entre 0 y 100%.");
            BigDecimal bonif = cero(item.getUnidadesBonificacion());
            exigir(bonif.signum() >= 0, "La cantidad bonificada no puede ser negativa.");
            if (item.getIdProductoBonif() != null) {
                exigir(!item.getIdProductoBonif().equals(item.getIdProducto()),
                    "Para el mismo producto usa unidades de bonificación.");
                exigir(item.getCantidadBonif() != null && item.getCantidadBonif().signum() > 0,
                    "La cantidad del producto regalado debe ser mayor a cero.");
            } else {
                exigir(cero(item.getCantidadBonif()).signum() == 0,
                    "Selecciona el producto regalado.");
            }
            BigDecimal descuento = bruto.multiply(pct).movePointLeft(2);
            BigDecimal neto = bruto.subtract(descuento);
            BigDecimal percepcion = activa ? neto.multiply(TASA) : BigDecimal.ZERO;
            // Solo compensación de centavos de presentación; CPP usa el 2% exacto.
            BigDecimal anteriorVisible = moneda(percepcionAcumulada);
            percepcionAcumulada = percepcionAcumulada.add(percepcion);
            BigDecimal visible = moneda(percepcionAcumulada).subtract(anteriorVisible);
            BigDecimal valorizado = neto.add(percepcion);
            BigDecimal totalUnidades = cantidad.add(bonif);
            lineas.add(new Linea(bruto, descuento, neto, percepcion, visible, valorizado,
                totalUnidades, valorizado.divide(totalUnidades, 4, RoundingMode.HALF_UP)));
            subtotal = subtotal.add(neto);
        }
        BigDecimal calculada = moneda(percepcionAcumulada);
        BigDecimal documento = moneda(ingresada);
        BigDecimal total = moneda(subtotal.add(documento).subtract(moneda(global)));
        exigir(total.signum() >= 0, "El descuento global no puede superar el total de la compra.");
        return new Resultado(List.copyOf(lineas), moneda(subtotal), calculada, documento,
            documento.subtract(calculada), total);
    }
}

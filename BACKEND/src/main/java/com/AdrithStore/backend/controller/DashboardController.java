package com.AdrithStore.backend.controller;

import com.AdrithStore.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DashboardController {

    private final VentaRepository               ventaRepo;
    private final ProductoRepository            productoRepo;
    private final CuentaFinancieraRepository    cuentaRepo;
    private final TransaccionFinancieraRepository transaccionRepo;

    // ── GET /api/dashboard/stats ──────────────────────────────────────────
    // idUsuario opcional: si se pasa filtra solo las ventas de ese vendedor
    @Transactional(readOnly = true)
    @GetMapping("/stats")
    public Map<String, Object> stats(
            @RequestParam(defaultValue = "hoy") String periodo,
            @RequestParam(required = false)     Integer idUsuario) {

        LocalDateTime desde = calcularDesde(periodo);
        LocalDateTime hasta = LocalDateTime.now();

        // Ventas del período — filtradas por usuario si se especifica
        List<com.AdrithStore.backend.model.Venta> ventas = (idUsuario != null)
            ? ventaRepo.findByUsuarioAndFecha(idUsuario, desde, hasta)
            : ventaRepo.findByFechaBetweenAndEstado(desde, hasta, "confirmado");

        int totalVentas = ventas.size();

        // Ingresos: suma de venta.total
        BigDecimal ingresos = ventas.stream()
            .map(v -> v.getTotal() != null ? v.getTotal() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Costos: suma desde venta_detalle (costoHistorico × cantidad)
        BigDecimal costos = ventaRepo.sumCostosEntreFechas(desde, hasta);
        if (costos == null) costos = BigDecimal.ZERO;

        // Gastos: egresos registrados en transacciones financieras del período
        // Tipo "EGRESO" en la tabla transaccion_financiera
        BigDecimal gastos = transaccionRepo.sumEgresosEntreFechas(desde, hasta);
        if (gastos == null) gastos = BigDecimal.ZERO;

        // Ticket promedio: ingresos / número de ventas
        BigDecimal ticketPromedio = totalVentas > 0
            ? ingresos.divide(BigDecimal.valueOf(totalVentas), 2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        // Margen bruto: ((ingresos - costos) / ingresos) × 100
        // Si ingresos es 0, margen es 0 para evitar división por cero
        BigDecimal margen = ingresos.compareTo(BigDecimal.ZERO) > 0
            ? ingresos.subtract(costos)
                .divide(ingresos, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        // Utilidad: ganancia neta sobre costos (rentabilidad sobre costo)
        // Fórmula: ((ingresos - costos - gastos) / costos) × 100
        BigDecimal ganancia = ingresos.subtract(costos).subtract(gastos);
        BigDecimal utilidad = costos.compareTo(BigDecimal.ZERO) > 0
            ? ganancia.divide(costos, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;


        // Stock bajo: productos cuyo stock < stock_alert
        long stockBajo = productoRepo.countProductosStockBajo();

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("periodo",            periodo);
        res.put("totalVentas",        totalVentas);
        res.put("totalIngresos",      ingresos);
        res.put("totalCostos",        costos);
        res.put("totalGastos",        gastos);       // ← nuevo
        res.put("margen",             margen);       // ← nuevo (porcentaje)
        res.put("utilidad",           utilidad);     // ← nuevo
        res.put("ticketPromedio",     ticketPromedio);
        res.put("productosStockBajo", stockBajo);
        return res;
    }

    // ── GET /api/dashboard/resumen-tesoreria ──────────────────────────────
    @GetMapping("/resumen-tesoreria")
    public Map<String, Object> resumenTesoreria() {
        var cuentas = cuentaRepo.findByActivaTrue();
        BigDecimal total = cuentas.stream()
            .map(c -> c.getSaldoActual() != null ? c.getSaldoActual() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("cuentas",      cuentas);
        res.put("totalGeneral", total);
        res.put("periodo",      LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM")));
        return res;
    }

    // ── Calcula el inicio del período según el parámetro ─────────────────
    private LocalDateTime calcularDesde(String periodo) {
        LocalDate hoy = LocalDate.now();
        return switch (periodo) {
            case "semana"       -> hoy.minusDays(7).atStartOfDay();
            case "mes"          -> hoy.withDayOfMonth(1).atStartOfDay();
            case "mes_anterior" -> hoy.minusMonths(1).withDayOfMonth(1).atStartOfDay();
            case "año"          -> hoy.withDayOfYear(1).atStartOfDay();
            default             -> hoy.atStartOfDay(); // "hoy"
        };
    }
}
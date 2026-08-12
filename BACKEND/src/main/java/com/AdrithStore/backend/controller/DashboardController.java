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
public class DashboardController {

    private final VentaRepository               ventaRepo;
    private final ProductoRepository            productoRepo;
    private final CuentaFinancieraRepository    cuentaRepo;
    private final TransaccionFinancieraRepository transaccionRepo;
    private final VentaDetalleServicioRepository ventaDetalleServicioRepo;
    private final CompraRepository              compraRepo;

    
    
    @Transactional(readOnly = true)
    @GetMapping("/stats")
    public Map<String, Object> stats(
            @RequestParam(defaultValue = "hoy") String periodo,
            @RequestParam(required = false)     Integer idUsuario) {

        LocalDateTime desde = calcularDesde(periodo);
        LocalDateTime hasta = LocalDateTime.now();

        
        List<com.AdrithStore.backend.model.Venta> ventas = (idUsuario != null)
            ? ventaRepo.findByUsuarioAndFecha(idUsuario, desde, hasta)
            : ventaRepo.findByFechaBetweenAndEstado(desde, hasta, "confirmado");

        int totalVentas = ventas.size();


        BigDecimal ingresos = ventas.stream()
            .map(v -> v.getTotal() != null ? v.getTotal() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // El monto transferido en una TRANSFERENCIA (SERVICIO_COMIS) es un movimiento interno
        // (Plin/Yape <-> efectivo), no una venta real — solo la comisión cobrada lo es. Se descuenta
        // del total de ingresos para que no infle la ganancia mostrada en el dashboard.
        BigDecimal montoTransferencias = ventaDetalleServicioRepo.sumMontoTransferenciasEntreFechas(desde, hasta);
        if (montoTransferencias == null) montoTransferencias = BigDecimal.ZERO;
        ingresos = ingresos.subtract(montoTransferencias);


        BigDecimal costos = ventaRepo.sumCostosEntreFechas(desde, hasta);
        if (costos == null) costos = BigDecimal.ZERO;

        
        
        BigDecimal gastos = transaccionRepo.sumEgresosEntreFechas(desde, hasta);
        if (gastos == null) gastos = BigDecimal.ZERO;

        
        BigDecimal ticketPromedio = totalVentas > 0
            ? ingresos.divide(BigDecimal.valueOf(totalVentas), 2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        
        
        BigDecimal margen = ingresos.compareTo(BigDecimal.ZERO) > 0
            ? ingresos.subtract(costos)
                .divide(ingresos, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        
        
        BigDecimal ganancia = ingresos.subtract(costos).subtract(gastos);
        BigDecimal utilidad = costos.compareTo(BigDecimal.ZERO) > 0
            ? ganancia.divide(costos, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;


        
        long stockBajo = productoRepo.countProductosStockBajo();

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("periodo",            periodo);
        res.put("totalVentas",        totalVentas);
        res.put("totalIngresos",      ingresos);
        res.put("totalCostos",        costos);
        res.put("totalGastos",        gastos);       
        res.put("margen",             margen);       
        res.put("utilidad",           utilidad);     
        res.put("ticketPromedio",     ticketPromedio);
        res.put("productosStockBajo", stockBajo);
        return res;
    }

    
    @GetMapping("/resumen-tesoreria")
    public Map<String, Object> resumenTesoreria() {
        var cuentas = cuentaRepo.findByActivaTrue();
        BigDecimal total = cuentas.stream()
            .map(c -> c.getSaldoActual() != null ? c.getSaldoActual() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPercepcion = compraRepo.sumPercepcionTotal();
        if (totalPercepcion == null) totalPercepcion = BigDecimal.ZERO;

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("cuentas",         cuentas);
        res.put("totalGeneral",    total);
        res.put("totalPercepcion", totalPercepcion);
        res.put("periodo",         LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM")));
        return res;
    }

    
    private LocalDateTime calcularDesde(String periodo) {
        LocalDate hoy = LocalDate.now();
        return switch (periodo) {
            case "semana"       -> hoy.minusDays(7).atStartOfDay();
            case "mes"          -> hoy.withDayOfMonth(1).atStartOfDay();
            case "mes_anterior" -> hoy.minusMonths(1).withDayOfMonth(1).atStartOfDay();
            case "año"          -> hoy.withDayOfYear(1).atStartOfDay();
            default             -> hoy.atStartOfDay(); 
        };
    }
}
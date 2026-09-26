package com.AdrithStore.backend.controller;

import com.AdrithStore.backend.repository.*;
import com.AdrithStore.backend.service.DashboardMetricasService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardMetricasService metricas;
    private final ProductoRepository            productoRepo;
    private final CuentaFinancieraRepository    cuentaRepo;
    private final CompraRepository              compraRepo;

    
    
    @GetMapping("/stats")
    public Map<String, Object> stats(
            @RequestParam(defaultValue = "hoy") String periodo,
            @RequestParam(defaultValue = "ingresos") String tipo,
            @RequestParam(required = false) Integer idUsuario) {
        var res = metricas.stats(periodo, tipo, idUsuario);
        res.put("productosStockBajo", productoRepo.countProductosStockBajo());
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

    
}

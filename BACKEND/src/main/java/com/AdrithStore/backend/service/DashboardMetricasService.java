package com.AdrithStore.backend.service;

import com.AdrithStore.backend.repository.DashboardLecturaRepository;
import com.AdrithStore.backend.repository.DashboardLecturaRepository.VentaComercial;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class DashboardMetricasService {
    private final DashboardLecturaRepository lecturas;
    private final PeriodosDashboard periodos;

    public Map<String, Object> stats(String periodo, String tipo, Integer vendedor) {
        validarTipo(tipo);
        var rango = periodos.resolver(periodo);
        var fin = rango.finExclusivo(periodos.ahora());
        var ventas = lecturas.ventas(rango.inicio(), fin, vendedor, null, null);
        var total = acumular(ventas, tipo);
        var serie = buckets(rango);
        for (var v : ventas) if (incluye(tipo, v)) serie.get(clave(v.fecha(), rango.agrupacion())).agregar(v);
        BigDecimal gastos = BigDecimal.ZERO;
        for (var g : lecturas.gastos(rango.inicio(), fin)) {
            gastos = gastos.add(g.monto());
            var bucket = serie.get(clave(g.fecha(), rango.agrupacion()));
            bucket.gastos = bucket.gastos.add(g.monto());
        }
        var res = total.mapa();
        res.put("periodo", rango.id());
        res.put("rango", rango);
        res.put("hastaExclusivo", fin);
        res.put("zonaHoraria", PeriodosDashboard.ZONA.getId());
        res.put("tipo", tipo);
        res.put("idVendedor", vendedor);
        res.put("totalGastos", gastos);
        res.put("gastosGlobales", true);
        res.put("totalCompras", lecturas.compras(rango.inicio(), fin));
        res.put("comprasGlobales", true);
        res.put("serie", serie.entrySet().stream().map(e -> {
            var item = e.getValue().mapa();
            item.put("fecha", e.getKey());
            item.put("dia", etiqueta(e.getKey(), rango.agrupacion()));
            return item;
        }).toList());
        return res;
    }

    public Map<String, Object> heatmap(String desde, String hasta, String periodo, String tipo,
            Integer producto, Integer categoria, Integer vendedor) {
        validarTipo(tipo);
        PeriodosDashboard.Periodo rango;
        if (desde == null && hasta == null) {
            var p = periodos.resolver(periodo);
            rango = new PeriodosDashboard.Periodo(p.id(), p.grupo(), p.etiqueta(), p.desde(), p.hasta(), "dia");
        } else {
            try {
                var d = LocalDate.parse(desde);
                var h = LocalDate.parse(hasta);
                if (h.isBefore(d) || ChronoUnit.DAYS.between(d, h) > 3660) throw new IllegalArgumentException();
                rango = new PeriodosDashboard.Periodo("personalizado", "rango", "Rango personalizado", d, h, "dia");
            } catch (RuntimeException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique un rango válido de hasta 10 años");
            }
        }
        var fin = rango.finExclusivo(periodos.ahora());
        var ventas = lecturas.ventas(rango.inicio(), fin, vendedor, producto, categoria);
        var total = acumular(ventas, tipo);
        var dias = buckets(rango);
        for (var v : ventas) if (incluye(tipo, v)) dias.get(clave(v.fecha(), "dia")).agregar(v);
        List<Map<String, Object>> contenido = new ArrayList<>();
        LocalDate maxDia = null;
        BigDecimal maxMonto = BigDecimal.ZERO;
        BigDecimal maxGanancia = BigDecimal.ZERO;
        for (var entry : dias.entrySet()) {
            var a = entry.getValue();
            var item = new LinkedHashMap<String, Object>();
            item.put("fecha", entry.getKey().toLocalDate());
            item.put("monto", a.ingresos);
            item.put("costos", a.costos);
            item.put("ganancia", a.ganancia());
            contenido.add(item);
            // Empate: fecha más reciente. Un rango íntegramente en cero no tiene día máximo.
            if (a.ingresos.signum() > 0 && a.ingresos.compareTo(maxMonto) >= 0) {
                maxDia = entry.getKey().toLocalDate(); maxMonto = a.ingresos; maxGanancia = a.ganancia();
            }
        }
        var resumen = total.mapa();
        resumen.put("diaMaximo", maxDia);
        resumen.put("montoDiaMaximo", maxMonto);
        resumen.put("gananciaDiaMaximo", maxGanancia);
        return Map.of("content", contenido, "totales", resumen, "rango", rango,
                "hastaExclusivo", fin, "tipo", tipo, "zonaHoraria", PeriodosDashboard.ZONA.getId(),
                "subconjunto", producto != null || categoria != null);
    }

    private void validarTipo(String tipo) {
        if (!Set.of("ingresos", "productos", "servicios").contains(tipo))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tipo de ingreso no válido");
    }

    private boolean incluye(String tipo, VentaComercial venta) {
        return "ingresos".equals(tipo) || tipo.equals(venta.tipo());
    }

    private Acumulado acumular(List<VentaComercial> ventas, String tipo) {
        var a = new Acumulado();
        for (var v : ventas) if (incluye(tipo, v)) a.agregar(v);
        return a;
    }

    private TreeMap<LocalDateTime, Acumulado> buckets(PeriodosDashboard.Periodo rango) {
        var resultado = new TreeMap<LocalDateTime, Acumulado>();
        rango.buckets().forEach(fecha -> resultado.put(fecha, new Acumulado()));
        return resultado;
    }

    private LocalDateTime clave(LocalDateTime fecha, String agrupacion) {
        return switch (agrupacion) {
            case "hora" -> fecha.truncatedTo(ChronoUnit.HOURS);
            case "mes" -> fecha.toLocalDate().withDayOfMonth(1).atStartOfDay();
            default -> fecha.toLocalDate().atStartOfDay();
        };
    }

    private String etiqueta(LocalDateTime fecha, String agrupacion) {
        String patron = switch (agrupacion) {
            case "hora" -> "HH:mm";
            case "mes" -> "MMM yy";
            default -> "dd/MM";
        };
        return fecha.format(DateTimeFormatter.ofPattern(patron, Locale.forLanguageTag("es-PE")));
    }

    private static class Acumulado {
        BigDecimal ingresos = BigDecimal.ZERO, costos = BigDecimal.ZERO, gastos = BigDecimal.ZERO;
        int costosAusentes;
        Set<Integer> ventas = new HashSet<>();
        Map<Integer, BigDecimal> descuentosGlobales = new HashMap<>();

        void agregar(VentaComercial v) {
            ingresos = ingresos.add(v.ingresos()); costos = costos.add(v.costos());
            costosAusentes += v.costosAusentes(); ventas.add(v.idVenta());
            descuentosGlobales.put(v.idVenta(), v.descuentoGlobal());
        }

        BigDecimal ganancia() { return ingresos.subtract(costos); }
        BigDecimal razon(BigDecimal numerador, BigDecimal denominador) {
            return denominador.signum() == 0 ? BigDecimal.ZERO
                    : numerador.divide(denominador, 2, RoundingMode.HALF_UP);
        }
        Map<String, Object> mapa() {
            var m = new LinkedHashMap<String, Object>();
            m.put("totalIngresos", ingresos); m.put("totalCostos", costos);
            m.put("ganancia", ganancia()); m.put("totalGastos", gastos);
            m.put("totalVentas", ventas.size());
            m.put("ticketPromedio", razon(ingresos, BigDecimal.valueOf(ventas.size())));
            m.put("margen", razon(ganancia().multiply(BigDecimal.valueOf(100)), ingresos));
            m.put("utilidad", razon(ganancia().multiply(BigDecimal.valueOf(100)), costos));
            m.put("costosAusentes", costosAusentes);
            m.put("descuentosGlobalesHistoricos", descuentosGlobales.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add));
            return m;
        }
    }
}

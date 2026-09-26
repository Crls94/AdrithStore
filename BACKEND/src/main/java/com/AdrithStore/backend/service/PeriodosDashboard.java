package com.AdrithStore.backend.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.IsoFields;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

/** Calendario operacional de Lima. Los intervalos de consulta son [desde, hastaExclusivo). */
@Service
public class PeriodosDashboard {
    public static final ZoneId ZONA = ZoneId.of("America/Lima");
    private static final Locale ES = Locale.forLanguageTag("es-PE");
    private final Clock clock;

    public PeriodosDashboard() { this(Clock.system(ZONA)); }
    public PeriodosDashboard(Clock clock) { this.clock = clock; }

    public record Periodo(String id, String grupo, String etiqueta, LocalDate desde,
                          LocalDate hasta, String agrupacion) {
        public LocalDateTime inicio() { return desde.atStartOfDay(); }
        public LocalDateTime finExclusivo(LocalDateTime ahora) {
            LocalDateTime fin = hasta.plusDays(1).atStartOfDay();
            return fin.isAfter(ahora) ? ahora : fin;
        }

        /** Incluye buckets vacíos y mantiene el orden cronológico, incluso al cambiar de año. */
        public List<LocalDateTime> buckets() {
            List<LocalDateTime> result = new ArrayList<>();
            LocalDateTime cursor = "mes".equals(agrupacion)
                    ? desde.withDayOfMonth(1).atStartOfDay() : inicio();
            LocalDateTime fin = hasta.plusDays(1).atStartOfDay();
            while (cursor.isBefore(fin)) {
                result.add(cursor);
                cursor = switch (agrupacion) {
                    case "hora" -> cursor.plusHours(1);
                    case "mes" -> cursor.plusMonths(1);
                    default -> cursor.plusDays(1);
                };
            }
            return result;
        }
    }

    public LocalDateTime ahora() { return LocalDateTime.now(clock.withZone(ZONA)); }

    public List<Periodo> opciones() {
        LocalDate hoy = ahora().toLocalDate();
        List<Periodo> result = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate dia = hoy.minusDays(i);
            result.add(new Periodo("dia:" + dia, "dia", i == 0 ? "Hoy" : dia.format(
                    DateTimeFormatter.ofPattern("EEEE d MMM", ES)), dia, dia, "hora"));
        }
        result.add(new Periodo("semana", "semana", "Últimos 7 días", hoy.minusDays(6), hoy, "dia"));
        LocalDate lunes = hoy.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        for (int i = 0; i < 4; i++) {
            LocalDate inicio = lunes.minusWeeks(i);
            String etiqueta = "Semana " + inicio.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR)
                    + " · " + inicio.get(IsoFields.WEEK_BASED_YEAR);
            result.add(new Periodo("semana:" + inicio, "semana", etiqueta,
                    inicio, inicio.plusDays(6), "dia"));
        }
        result.add(new Periodo("mes", "mes", "Últimos 30 días", hoy.minusDays(29), hoy, "dia"));
        for (int i = 0; i < 6; i++) {
            LocalDate inicio = hoy.minusMonths(i).withDayOfMonth(1);
            result.add(new Periodo("mes:" + YearMonth.from(inicio), "mes",
                    inicio.format(DateTimeFormatter.ofPattern("MMMM yyyy", ES)),
                    inicio, inicio.with(TemporalAdjusters.lastDayOfMonth()), "dia"));
        }
        result.add(new Periodo("año", "año", "Últimos 365 días", hoy.minusDays(364), hoy, "mes"));
        for (int i = 0; i < 5; i++) {
            LocalDate inicio = hoy.minusYears(i).withDayOfYear(1);
            result.add(new Periodo("año:" + inicio.getYear(), "año", String.valueOf(inicio.getYear()),
                    inicio, inicio.with(TemporalAdjusters.lastDayOfYear()), "mes"));
        }
        return result;
    }

    public Periodo resolver(String id) {
        List<Periodo> opciones = opciones();
        if (id == null || "hoy".equals(id)) return opciones.getFirst();
        // Compatibilidad con los consumidores anteriores del dashboard.
        if ("mes_anterior".equals(id)) {
            id = "mes:" + YearMonth.from(ahora().minusMonths(1));
        }
        String buscado = id;
        return opciones.stream().filter(p -> p.id().equals(buscado)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Período no válido"));
    }
}

package com.AdrithStore.backend;

import com.AdrithStore.backend.service.PeriodosDashboard;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.time.*;

import static org.assertj.core.api.Assertions.*;

class PeriodosDashboardTest {
    private PeriodosDashboard calendario(String instante) {
        return new PeriodosDashboard(Clock.fixed(Instant.parse(instante), ZoneOffset.UTC));
    }

    @Test void hoySeDefineEnLimaYNoEnLaZonaDelServidor() {
        var p = calendario("2026-09-26T02:00:00Z");
        assertThat(p.resolver("hoy").desde()).isEqualTo(LocalDate.of(2026, 9, 25));
        assertThat(p.resolver("hoy").buckets()).hasSize(24).isSorted();
        assertThat(p.opciones().stream().filter(o -> o.grupo().equals("dia"))).hasSize(7);
    }

    @Test void semanaMovilYCalendarioSonOpcionesDistintas() {
        var p = calendario("2026-09-18T15:00:00Z");
        assertThat(p.resolver("semana").desde()).isEqualTo("2026-09-12");
        assertThat(p.resolver("semana").buckets()).hasSize(7);
        var actual = p.resolver("semana:2026-09-14");
        assertThat(actual.etiqueta()).isEqualTo("Semana 38 · 2026");
        assertThat(actual.hasta()).isEqualTo("2026-09-20");
        assertThat(actual.finExclusivo(p.ahora())).isEqualTo(p.ahora());
        var anterior = p.resolver("semana:2026-09-07");
        assertThat(anterior.finExclusivo(p.ahora())).isEqualTo("2026-09-14T00:00:00");
        assertThat(p.opciones().stream().filter(o -> o.grupo().equals("semana"))).hasSize(5);
    }

    @Test void numeracionIsoCruzaElAnioSinPerderOrden() {
        var p = calendario("2027-01-01T15:00:00Z");
        assertThat(p.resolver("semana:2026-12-28").etiqueta()).isEqualTo("Semana 53 · 2026");
        assertThat(p.resolver("semana").buckets()).isSorted().hasSize(7);
    }

    @Test void mesMovilCalendarioYFebreroBisiesto() {
        var p = calendario("2024-03-10T15:00:00Z");
        assertThat(p.resolver("mes").buckets()).hasSize(30);
        var febrero = p.resolver("mes:2024-02");
        assertThat(febrero.buckets()).hasSize(29);
        assertThat(febrero.finExclusivo(p.ahora())).isEqualTo("2024-03-01T00:00:00");
        assertThat(p.resolver("mes:2024-03").finExclusivo(p.ahora())).isEqualTo(p.ahora());
        assertThat(p.opciones().stream().filter(o -> o.grupo().equals("mes"))).hasSize(7);
    }

    @Test void anioMovilConMesesParcialesYCalendarioCompleto() {
        var p = calendario("2026-09-18T15:00:00Z");
        assertThat(p.resolver("año").desde()).isEqualTo("2025-09-19");
        assertThat(p.resolver("año").buckets()).hasSize(13).isSorted();
        assertThat(p.resolver("año:2025").buckets()).hasSize(12);
        assertThat(p.resolver("año:2025").finExclusivo(p.ahora())).isEqualTo("2026-01-01T00:00:00");
        assertThat(p.opciones().stream().filter(o -> o.grupo().equals("año"))).hasSize(6);
    }

    @Test void rechazaPeriodosFueraDeOpciones() {
        var p = calendario("2026-09-18T15:00:00Z");
        assertThatThrownBy(() -> p.resolver("dia:2026-09-19"))
                .isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> p.resolver("semana:2026-09-15"))
                .isInstanceOf(ResponseStatusException.class);
    }
}

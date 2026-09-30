package com.AdrithStore.backend;

import com.AdrithStore.backend.infraestructura.*;
import com.AdrithStore.backend.repository.CompraRepository;
import com.AdrithStore.backend.repository.VentaRepository;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import java.math.BigDecimal;
import java.util.concurrent.TimeUnit;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class InfraestructuraMetricasTest {
    @Test void latenciaPonderadaYErroresNativosSinExponerTags() {
        var registry = new SimpleMeterRegistry();
        try {
            Timer ok = registry.timer("http.server.requests", "status", "200", "uri", "/privado");
            ok.record(100, TimeUnit.MILLISECONDS);
            ok.record(200, TimeUnit.MILLISECONDS);
            registry.timer("http.server.requests", "status", "404").record(300, TimeUnit.MILLISECONDS);
            registry.timer("http.server.requests", "status", "503").record(400, TimeUnit.MILLISECONDS);
            var metricas = new MetricasNativas(registry).leer(false).getFirst().metricas();
            assertThat(metricas.stream().filter(m -> m.id().equals("http.requests")).findFirst().orElseThrow().valor()).isEqualTo(4);
            assertThat(metricas.stream().filter(m -> m.id().equals("http.latency.mean")).findFirst().orElseThrow().valor()).isEqualTo(250);
            assertThat(metricas.stream().filter(m -> m.id().startsWith("http.errors")).map(MetricasSnapshot.Metrica::valor)).containsExactly(1.0, 1.0);
            assertThat(metricas.toString()).doesNotContain("/privado");
        } finally { registry.close(); }
    }
    @Test void ausenciaNoSeConvierteEnCeroNiNaN() {
        var registry = new SimpleMeterRegistry();
        try {
            registry.gauge("process.cpu.usage", Double.NaN);
            var secciones = new MetricasNativas(registry).leer(false);
            assertThat(secciones.get(1).metricas()).allMatch(m -> m.estado() == MetricasSnapshot.Estado.NO_DISPONIBLE && m.valor() == null);
            assertThat(secciones.getFirst().metricas().stream().filter(m -> m.id().equals("http.latency.mean")).findFirst().orElseThrow().valor()).isNull();
        } finally { registry.close(); }
    }
    @Test void cargaTecnicaNoConsultaRepositorios() {
        var ventas = mock(VentaRepository.class);
        var compras = mock(CompraRepository.class);
        new MetricasActividad(ventas, compras).leer(false);
        verifyNoInteractions(ventas, compras);
    }
    @Test void contextoReutilizaSoloAgregadosYOcultaErroresSql() {
        var ventas = mock(VentaRepository.class);
        var compras = mock(CompraRepository.class);
        when(ventas.sumTotal(any(), any(), isNull(), isNull(), eq("confirmado"))).thenReturn(new BigDecimal("125.50"));
        when(compras.sumTotal(any(), any(), isNull(), eq("confirmado"))).thenThrow(new DataAccessResourceFailureException("jdbc:postgresql://secreto password=privada"));
        var result = new MetricasActividad(ventas, compras).leer(true).getFirst().metricas();
        assertThat(result.getFirst().valor()).isEqualTo(125.5);
        assertThat(result.get(1).estado()).isEqualTo(MetricasSnapshot.Estado.NO_DISPONIBLE);
        assertThat(result.toString()).doesNotContain("secreto", "password", "jdbc:");
        verify(ventas).sumTotal(any(), any(), isNull(), isNull(), eq("confirmado"));
        verify(compras).sumTotal(any(), any(), isNull(), eq("confirmado"));
        verifyNoMoreInteractions(ventas, compras);
    }
}

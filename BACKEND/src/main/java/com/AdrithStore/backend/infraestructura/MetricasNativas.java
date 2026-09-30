package com.AdrithStore.backend.infraestructura;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

import static com.AdrithStore.backend.infraestructura.MetricasSnapshot.*;

@Component
public class MetricasNativas implements ProveedorMetricas {
    private final MeterRegistry registry;
    public MetricasNativas(MeterRegistry registry) { this.registry = registry; }

    @Override public List<Seccion> leer(boolean incluirActividad) {
        return List.of(new Seccion("aplicacion", "Backend / HTTP", http()),
                new Seccion("jvm", "JVM / Proceso", List.of(
                        gauge("jvm.memory.used", "Memoria JVM usada", "bytes"),
                        gauge("jvm.memory.committed", "Memoria JVM reservada", "bytes"),
                        gauge("jvm.threads.live", "Threads activos", "threads"),
                        gauge("process.cpu.usage", "CPU del proceso", "ratio"),
                        gauge("system.cpu.usage", "CPU del sistema", "ratio"),
                        gauge("process.uptime", "Uptime", "s"),
                        gauge("process.start.time", "Inicio del proceso (Unix)", "s"),
                        timerTotal("jvm.gc.pause", "Tiempo acumulado de pausas GC"))),
                new Seccion("postgresql", "PostgreSQL / Pool Hikari", List.of(
                        gauge("hikaricp.connections.active", "Conexiones activas", "conexiones"),
                        gauge("hikaricp.connections.idle", "Conexiones libres", "conexiones"),
                        gauge("hikaricp.connections.pending", "Solicitudes pendientes", "solicitudes"),
                        gauge("hikaricp.connections.max", "Maximo de conexiones", "conexiones"),
                        gauge("hikaricp.connections.min", "Minimo de conexiones", "conexiones"))));
    }

    private Metrica gauge(String id, String nombre, String unidad) {
        var gauges = registry.find(id).gauges();
        if (gauges.isEmpty()) return Metrica.ausente(id, nombre, unidad, "Instrumento no registrado en esta instancia.");
        double valor = gauges.stream().mapToDouble(Gauge::value).sum();
        return Metrica.medida(id, nombre, valor, unidad, "Lectura nativa; el pool no verifica conectividad SQL.");
    }

    private Metrica timerTotal(String id, String nombre) {
        var timers = registry.find(id).timers();
        return timers.isEmpty() ? Metrica.ausente(id, nombre, "ms", "Todavia no hay muestras registradas.")
                : Metrica.medida(id, nombre, timers.stream().mapToDouble(t -> t.totalTime(TimeUnit.MILLISECONDS)).sum(),
                        "ms", "Acumulado desde el inicio de esta instancia.");
    }

    private List<Metrica> http() {
        var timers = registry.find("http.server.requests").timers();
        var result = new ArrayList<Metrica>();
        long count = timers.stream().mapToLong(Timer::count).sum();
        String detalle = "Acumulado desde el inicio; incluye el monitor. La peticion actual aparece al completarse.";
        result.add(Metrica.medida("http.requests", "Requests completados", count, "requests", detalle));
        for (String clase : List.of("4", "5")) {
            long errores = timers.stream().filter(t -> {
                String status = t.getId().getTag("status");
                return status != null && status.startsWith(clase);
            }).mapToLong(Timer::count).sum();
            result.add(Metrica.medida("http.errors." + clase + "xx", "Errores " + clase + "xx", errores, "requests", detalle));
        }
        double total = timers.stream().mapToDouble(t -> t.totalTime(TimeUnit.MILLISECONDS)).sum();
        result.add(count == 0 ? Metrica.ausente("http.latency.mean", "Latencia media", "ms", "Sin requests completados.")
                : Metrica.medida("http.latency.mean", "Latencia media", total / count, "ms", "Media ponderada desde el inicio de esta instancia."));
        result.add(timerTotal("http.server.requests", "Tiempo HTTP acumulado"));
        return result;
    }
}

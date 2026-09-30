package com.AdrithStore.backend.infraestructura;

import com.AdrithStore.backend.repository.CompraRepository;
import com.AdrithStore.backend.repository.VentaRepository;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.function.Supplier;
import java.math.BigDecimal;

import static com.AdrithStore.backend.infraestructura.MetricasSnapshot.*;

@Component
public class MetricasActividad implements ProveedorMetricas {
    private final VentaRepository ventas;
    private final CompraRepository compras;
    public MetricasActividad(VentaRepository ventas, CompraRepository compras) {
        this.ventas = ventas;
        this.compras = compras;
    }
    @Override
    public List<Seccion> leer(boolean incluirActividad) {
        var desde = LocalDate.now(ZoneId.of("America/Lima")).atStartOfDay();
        var hasta = desde.plusDays(1).minusNanos(1);
        String detalle = "Totales confirmados de hoy (America/Lima), segun las consultas comerciales existentes.";
        if (!incluirActividad) return List.of(new Seccion("actividad", "Actividad comercial de hoy", List.of(
                Metrica.ausente("actividad.ventas", "Total ventas confirmadas", "PEN", "Carga manual opcional; no se consulto la BD."),
                Metrica.ausente("actividad.compras", "Total compras confirmadas", "PEN", "Carga manual opcional; no se consulto la BD."))));
        // Dos agregados existentes: no cargar entidades ni recalcular reglas comerciales.
        return List.of(new Seccion("actividad", "Actividad comercial de hoy", List.of(
                agregado("actividad.ventas", "Total ventas confirmadas", detalle,
                        () -> ventas.sumTotal(desde, hasta, null, null, "confirmado")),
                agregado("actividad.compras", "Total compras confirmadas", detalle,
                        () -> compras.sumTotal(desde, hasta, null, "confirmado")))));
    }
    private Metrica agregado(String id, String nombre, String detalle, Supplier<BigDecimal> consulta) {
        try {
            BigDecimal valor = consulta.get();
            return valor == null ? Metrica.ausente(id, nombre, "PEN", "Sin valor disponible.")
                    : Metrica.medida(id, nombre, valor.doubleValue(), "PEN", detalle);
        } catch (DataAccessException ex) {
            // Nunca devolver mensajes SQL/connection strings al cliente.
            return Metrica.ausente(id, nombre, "PEN", "No fue posible consultar la actividad comercial.");
        }
    }
}

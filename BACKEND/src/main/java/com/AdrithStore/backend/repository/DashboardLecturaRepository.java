package com.AdrithStore.backend.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Proyecciones de lectura: nunca carga/modifica entidades ni recalcula snapshots históricos. */
@Repository
@RequiredArgsConstructor
public class DashboardLecturaRepository {
    private final NamedParameterJdbcTemplate jdbc;

    public record VentaComercial(int idVenta, LocalDateTime fecha, String tipo,
            BigDecimal ingresos, BigDecimal costos, int costosAusentes, BigDecimal descuentoGlobal) {}
    public record Gasto(LocalDateTime fecha, BigDecimal monto) {}

    public List<VentaComercial> ventas(LocalDateTime desde, LocalDateTime hasta,
            Integer vendedor, Integer producto, Integer categoria) {
        var params = new MapSqlParameterSource().addValue("desde", desde).addValue("hasta", hasta);
        String filtros = "";
        if (vendedor != null) { filtros += " AND v.id_usuario = :vendedor"; params.addValue("vendedor", vendedor); }
        if (producto != null) { filtros += " AND l.id_producto = :producto"; params.addValue("producto", producto); }
        if (categoria != null) { filtros += " AND p.id_categoria = :categoria"; params.addValue("categoria", categoria); }
        // UNION ALL evita multiplicar productos por servicios/pagos de una venta mixta.
        // subtotal ya incorpora descuentoItem. El global histórico no se redistribuye entre líneas.
        String sql = """
            WITH lineas AS (
                SELECT d.id_venta, d.id_producto, 'productos' AS tipo,
                       coalesce(d.subtotal, 0) AS ingresos,
                       coalesce(d.costo_historico * d.cantidad, 0) AS costos,
                       CASE WHEN d.costo_historico IS NULL OR d.cantidad IS NULL THEN 1 ELSE 0 END AS costo_ausente
                FROM venta_detalle d
                UNION ALL
                SELECT s.id_venta, s.id_producto, 'servicios' AS tipo,
                       CASE WHEN sp.tipo = 'SERVICIO_COMIS' THEN coalesce(s.comision, 0)
                            ELSE coalesce(s.subtotal, 0) END AS ingresos,
                       coalesce(s.costo, 0) AS costos,
                       CASE WHEN s.costo IS NULL THEN 1 ELSE 0 END AS costo_ausente
                FROM venta_detalle_servicio s LEFT JOIN producto sp ON sp.id_producto = s.id_producto
            )
            SELECT v.id_venta, v.fecha, l.tipo, sum(l.ingresos) AS ingresos,
                   sum(l.costos) AS costos, sum(l.costo_ausente) AS costos_ausentes,
                   coalesce(v.descuento_global, 0) AS descuento_global
            FROM lineas l JOIN venta v ON v.id_venta = l.id_venta
            LEFT JOIN producto p ON p.id_producto = l.id_producto
            WHERE v.estado = 'confirmado' AND v.fecha >= :desde AND v.fecha < :hasta
            """ + filtros + " GROUP BY v.id_venta, v.fecha, l.tipo, v.descuento_global ORDER BY v.fecha, v.id_venta";
        return jdbc.query(sql, params, (rs, row) -> new VentaComercial(rs.getInt("id_venta"),
                rs.getTimestamp("fecha").toLocalDateTime(), rs.getString("tipo"),
                rs.getBigDecimal("ingresos"), rs.getBigDecimal("costos"),
                rs.getInt("costos_ausentes"), rs.getBigDecimal("descuento_global")));
    }

    public List<Gasto> gastos(LocalDateTime desde, LocalDateTime hasta) {
        return jdbc.query("""
                SELECT fecha, coalesce(monto, 0) AS monto FROM transaccion_financiera
                WHERE tipo_mov = 'GASTO' AND signo = -1 AND fecha >= :desde AND fecha < :hasta
                ORDER BY fecha
                """, new MapSqlParameterSource().addValue("desde", desde).addValue("hasta", hasta),
                (rs, row) -> new Gasto(rs.getTimestamp("fecha").toLocalDateTime(), rs.getBigDecimal("monto")));
    }

    public BigDecimal compras(LocalDateTime desde, LocalDateTime hasta) {
        return jdbc.queryForObject("""
                SELECT coalesce(sum(total), 0) FROM compra
                WHERE estado = 'confirmado' AND fecha >= :desde AND fecha < :hasta
                """, new MapSqlParameterSource().addValue("desde", desde).addValue("hasta", hasta), BigDecimal.class);
    }
}

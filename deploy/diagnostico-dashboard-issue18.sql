-- Solo lectura. Ejecutar con psql contra el respaldo/entorno que contiene el caso:
-- psql ... -v desde=2026-09-13 -v hasta=2026-09-13 -v vendedor=0 -f diagnostico-dashboard-issue18.sql
-- Las fechas anteriores son ejemplos: usar el día real del incidente.
-- vendedor=0 significa Todos. No contiene credenciales ni cambia registros.
\set ON_ERROR_STOP on
BEGIN READ ONLY;

WITH productos AS (
    SELECT id_venta, sum(subtotal) importe, sum(costo_historico * cantidad) costo,
           sum(descuento_item) descuentos_linea
    FROM venta_detalle GROUP BY id_venta
), servicios AS (
    SELECT s.id_venta, sum(s.subtotal) importe, sum(s.costo) costo,
           sum(CASE WHEN p.tipo = 'SERVICIO_COMIS' THEN s.monto ELSE 0 END) principal,
           sum(CASE WHEN p.tipo = 'SERVICIO_COMIS' THEN s.comision ELSE s.subtotal END) comercial,
           count(*) FILTER (WHERE s.costo IS NULL) costos_ausentes,
           count(*) FILTER (WHERE p.tipo IS NULL) tipos_ausentes
    FROM venta_detalle_servicio s LEFT JOIN producto p USING (id_producto)
    GROUP BY s.id_venta
), desglose AS (
    SELECT v.id_venta, v.fecha, v.id_usuario, v.estado,
           coalesce(v.total, 0) total_cabecera,
           coalesce(v.descuento_global, 0) descuento_global,
           coalesce(p.importe, 0) productos,
           coalesce(p.descuentos_linea, 0) descuentos_linea,
           coalesce(s.importe, 0) servicios_con_principal,
           coalesce(s.principal, 0) principal,
           coalesce(s.comercial, 0) servicios_comerciales,
           coalesce(p.costo, 0) costos_productos,
           coalesce(s.costo, 0) costos_servicios,
           coalesce(s.costos_ausentes, 0) costos_servicio_ausentes,
           coalesce(s.tipos_ausentes, 0) tipos_servicio_ausentes
    FROM venta v LEFT JOIN productos p USING (id_venta) LEFT JOIN servicios s USING (id_venta)
    WHERE v.fecha >= :'desde'::date AND v.fecha < :'hasta'::date + interval '1 day'
)
SELECT *,
       total_cabecera - principal AS ingreso_cabecera_individual,
       productos + servicios_comerciales AS ingreso_por_lineas,
       total_cabecera - (productos + servicios_con_principal - descuento_global) AS diferencia_no_explicada
FROM desglose
WHERE (:vendedor::integer = 0 OR id_usuario = :vendedor::integer)
ORDER BY fecha, id_venta;

-- Reproduce también el defecto del card al filtrar vendedor: resta principal de TODOS.
WITH ventas_rango AS (
    SELECT * FROM venta WHERE estado = 'confirmado'
    AND fecha >= :'desde'::date AND fecha < :'hasta'::date + interval '1 day'
), cabeceras AS (
    SELECT coalesce(sum(total),0) importe FROM ventas_rango
    WHERE (:vendedor::integer = 0 OR id_usuario = :vendedor::integer)
), principal_global AS (
    SELECT coalesce(sum(s.monto),0) importe FROM venta_detalle_servicio s
    JOIN ventas_rango v USING(id_venta) JOIN producto p USING(id_producto)
    WHERE p.tipo = 'SERVICIO_COMIS'
), heatmap AS (
    SELECT coalesce(sum(d.subtotal),0) importe FROM venta_detalle d
    JOIN ventas_rango v USING(id_venta)
    WHERE (:vendedor::integer = 0 OR v.id_usuario = :vendedor::integer)
)
SELECT c.importe - p.importe card_anterior, h.importe heatmap_anterior,
       h.importe - (c.importe - p.importe) diferencia
FROM cabeceras c CROSS JOIN principal_global p CROSS JOIN heatmap h;

SELECT count(*) gastos, count(creada_por) gastos_con_autor,
       coalesce(sum(monto),0) importe
FROM transaccion_financiera
WHERE tipo_mov = 'GASTO' AND signo = -1
AND fecha >= :'desde'::date AND fecha < :'hasta'::date + interval '1 day';

ROLLBACK;

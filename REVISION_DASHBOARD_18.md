# Issue #18 — implementación

Issue: https://github.com/Crls94/AdrithStore/issues/18

La especificación vigente indica que los datos originales de S/504.50 y S/563.50
no son condición de bloqueo. La base local contiene ventas hasta el 23 de julio
de 2026 y no contiene ese día. Se verificó la conciliación con un fixture de
PostgreSQL desechable; no se editaron datos históricos.

## Fuente comercial común

`DashboardMetricasService` utiliza `DashboardLecturaRepository` para alimentar
la tarjeta principal, las series, las métricas derivadas y el heatmap.
En una misma transacción de lectura, el backend filtra ventas confirmadas por
rango y vendedor, suma subtotales persistidos de líneas de producto y servicio,
y agrega una venta mixta una sola vez. Productos usan `subtotal` y
`costoHistorico × cantidad`; servicios leen `subtotal` y `costo` persistidos.
Para `SERVICIO_COMIS`, el ingreso es `comision`: `monto` es el principal
movilizado y no se cuenta como venta o costo.

Los descuentos por línea ya están reflejados en `subtotal`. Los descuentos
globales históricos se reportan aparte y no se prorratean ni modifican líneas.
Costos de servicio ausentes se señalan en la UI y no se corrigen desde #18.
Gastos permanecen como total global del negocio en el período, también al
filtrar vendedor. Ganancia = ingresos comerciales − costos directos; gastos no
se restan. Margen y utilidad se calculan sobre los importes agregados del mismo
universo. Compras confirmadas aparecen como métrica global del período.

El heatmap devuelve importes por día y un resumen de total vendido, ganancia,
día de mayor venta y ganancia de ese día. Los empates favorecen el día más
reciente; un rango sin ventas muestra “—” para día máximo y ceros en sus buckets.
Los filtros de producto, categoría y vendedor se aplican a líneas, costos,
ganancia y resumen por igual. La UI indica cuándo el mapa está filtrado como
subconjunto del total general.

## Períodos y presentación

`GET /api/dashboard/periodos` proporciona calendario America/Lima: hoy y seis
días previos, últimos siete días y cuatro semanas ISO, últimos treinta días y
seis meses calendario, últimos 365 días y cinco años calendario. Los meses,
semanas y años incompletos terminan en el momento actual; las series conservan
buckets en cero y orden cronológico.

El dashboard ofrece los selectores independientes de tipo comercial, período
y serie auxiliar. Ingresos es el tipo y hoy el período inicial; Gastos y Ganancia
son auxiliares mutuamente excluyentes y Ganancia usa #FAA222. Los cambios de
filtro conservan los últimos datos mientras carga la respuesta nueva. La tarjeta
principal usa una cuadrícula de 3×3 en desktop y en móvil; Saldo Total siempre
representa las cuentas activas actuales. Los gastos muestran que son globales.
El heatmap conserva su título exterior único y controles adaptables. Reportes
identifica sus sumas como totales de comprobantes, que pueden incluir principal
movilizado y descuento global.

`Dashboard2.jsx` ahora reexporta la implementación común para evitar mantener
una segunda definición de ingresos. La cuenta/medio Transferencia y los datos
históricos se conservaron. No se modificaron CPP, inventario ni costos de compra;
el cálculo autoritativo futuro de costos de servicios sigue dentro de #13.

## Verificación

- `mvn.cmd -q -Dtest=PeriodosDashboardTest test`: 6 pruebas, sin fallos.
- `mvn.cmd -q -Dtest=DashboardIssue18IntegrationTest,PeriodosDashboardTest -Ddashboard.test.url=jdbc:postgresql://127.0.0.1:55438/adrith_dashboard_issue18 test`: 15 pruebas, sin fallos. Las pruebas usan PostgreSQL aislado y cubren productos, descuentos por línea, servicio puro, transferencia con comisión, venta mixta, anuladas, vendedor, gastos globales, snapshots y costos ausentes, compra, rango vacío, rangos temporales, empates y límites exclusivos. La suma por buckets concilia exactamente con el total.
- `npm.cmd run build`: correcto. Vite conserva su aviso existente sobre el tamaño del bundle.
- `FRONTEND/tests/dashboard-issue18.e2e.cjs`: Edge headless pasó los defaults, selectores y su independencia, series auxiliares exclusivas, carga, filtros, conciliación, recarga y errores de JavaScript. No encontró overflow horizontal a 1440, 390 ni 320 px.
- Las capturas de revisión se guardaron fuera del repositorio en `%TEMP%/adrith-issue18-ui/`.

La lectura de Reportes mantiene los totales de comprobantes originales; la UI
explica cómo difieren de ingresos comerciales. #18 sigue siendo un dashboard
operacional y no un reporte tributario.

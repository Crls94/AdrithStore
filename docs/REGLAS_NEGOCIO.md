# AdrithStore — Reglas de negocio

Documento vivo. Resume decisiones aprobadas; los issues de GitHub conservan el detalle, evidencia y criterios de aceptación.

## Compras e inventario

- Descuento por línea reduce el costo real de compra y participa en CPP.
- Percepción de compra se incorpora a la valorización según la regla aprobada.
- Descuento global de compra afecta tesorería, no CPP.
- Stock previo > 0: CPP ponderado.
- Stock previo <= 0: la nueva recepción inicia disponibilidad desde la cantidad recibida y el CPP previo no participa.
- Bonificaciones del mismo producto distribuyen el valor pagado sobre unidades pagadas + gratuitas.
- Bonificación de producto distinto conserva la semántica definida para ese producto y debe ser trazable.

## Ventas

- Costo histórico de producto = CPP congelado al momento de vender.
- El precio histórico debe representar el precio unitario final realmente vendido.
- Los descuentos son por línea para el modelo futuro; no deben alterar CPP.
- El precio final no debe quedar por debajo del costo histórico según la regla aprobada.
- Ventas anuladas no participan en métricas comerciales.

## Servicios

Existen actualmente servicios puros, impresiones con costo porcentual y operaciones de comisión/movimiento.

Regla arquitectónica definitiva: el frontend puede mostrar/previsualizar costos, pero el backend debe determinar y persistir el costo autoritativo usando configuración de BD. Esta corrección estructural está pendiente en #13.

Hasta resolver #13, el dashboard #18 puede consumir el costo histórico de servicio que ya está persistido por el flujo actual, sin bloquear su implementación. No se deben reescribir históricos.

### Operaciones tipo SERVICIO_COMIS

El monto principal movilizado **no se convierte artificialmente en costo**. Debe distinguirse entre:
- monto movilizado;
- comisión/ingreso propio;
- costo directo real, si existe y está registrado;
- movimiento de tesorería.

El dashboard puede mostrar una métrica operacional de monto atendido/cobrado cuando así se defina, pero una presentación contable/tributaria no debe convertir automáticamente el principal movilizado en ingreso ni costo.

## Dashboard

- Ganancia del dashboard = ingresos comerciales - costos directos históricos.
- Gastos se muestran aparte y **no se restan de Ganancia**.
- Margen = Ganancia / Ingresos × 100.
- Utilidad % se conserva como indicador referencial = Ganancia / Costos × 100.
- Ticket promedio = ingresos comerciales / número de ventas comerciales confirmadas del mismo universo.
- Saldo Total es estado actual y no depende del período.
- Gastos sí dependen del período, pero su tratamiento financiero detallado corresponde a Tesorería/Cierre de caja.

## Pendiente

- #13: backend autoritativo para costos de servicios y consistencia de filtros.
- Tesorería/Cierre de caja: definición financiera detallada de gastos y cierre.
- Reportes tributarios: separar explícitamente de dashboard operacional; no asumir equivalencia entre KPI comercial y base tributaria.
- #19: transformación de productos y transferencia de valor.

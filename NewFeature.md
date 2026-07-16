# Features Pendientes

## 1. Anulación de gastos (Fase B)

**Backend:** `POST /api/tesoreria/gasto/{id}/anular`
- Buscar transacción por id
- Validar que sea tipo `GASTO` y no esté ya anulada
- Crear transacción inversa (mismo monto, signo opuesto)
- Actualizar saldo de la cuenta
- Registrar en EventoLog

**Frontend:** `Tesoreria.jsx` — tabla Movimientos
- Columna de acciones con botón "↩ Anular" solo para tipo `GASTO`
- Modal de confirmación con motivo de anulación

## 2. Registrar ingreso manual

**Backend:** `POST /api/tesoreria/ingreso`
- Similar a registrar gasto pero con signo +1
- Tipos: VENTA, OTRO_INGRESO, AJUSTE

**Frontend:** `Tesoreria.jsx` — tab Registrar
- Selector "Tipo: Gasto / Ingreso" al inicio del formulario
- Si es ingreso: campos equivalentes pero sin validación de saldo

## 3. Nota sobre RETIRO en el Dashboard

El dashboard **NO** considera `RETIRO` como gasto. El `totalGastos` del dashboard solo suma `tipoMov = 'GASTO'` (ver query `sumEgresosEntreFechas` en `TransaccionFinancieraRepository.java:38-48`). `RETIRO` es otro tipo — no se mezcla.

Pero el `resumen-tesoreria` del dashboard **SÍ** se ve afectado. Ese endpoint devuelve `saldoActual` de cada cuenta. Después del cierre, `saldoActual` se redujo al `Fondo_Caja` (ej: Caja Física pasó de S/1,250 a S/200). Entonces el `totalGeneral` del dashboard refleja ese cambio.

En el tab Movimientos de Tesorería sí verás los RETIROS listados, pero el Dashboard los trata como ganancia retirada (no como gasto).

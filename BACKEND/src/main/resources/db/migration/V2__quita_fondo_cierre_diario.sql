-- El concepto de "Fondo" (dejar un monto fijo configurado en caja para el día
-- siguiente) no aplica al modelo de negocio: el efectivo se cuenta y se confía
-- en el sistema (ventas/compras ya están bien registradas), no se "reserva"
-- plata de un día para otro. La aplicación deja de leer/escribir
-- cierre_diario.fondo_dejado y cierre_diario.retiro (ver CierreDiario.java),
-- pero se conservan como historial en vez de borrarlas: solo se relaja el
-- NOT NULL para no romper el guardado de cierres nuevos, que ya no las va a
-- completar.
ALTER TABLE cierre_diario ALTER COLUMN fondo_dejado DROP NOT NULL;
ALTER TABLE cierre_diario ALTER COLUMN retiro DROP NOT NULL;

-- ck_transaccion_tipo_mov (V1) le faltaba 'COMPRA_ANULADA' pese a que
-- CompraController.anular() ya lo usa desde antes de esta migración — anular
-- una compra rompía este constraint. Se aprovecha para agregarlo junto con
-- 'APORTE', el tipo nuevo del botón "Ingreso de Capital"
-- (TesoreriaController.registrarIngresoCapital).
ALTER TABLE transaccion_financiera DROP CONSTRAINT ck_transaccion_tipo_mov;
ALTER TABLE transaccion_financiera ADD CONSTRAINT ck_transaccion_tipo_mov
    CHECK (tipo_mov IN (
        'APERTURA', 'VENTA', 'COMPRA', 'COMPRA_ANULADA', 'GASTO', 'APORTE',
        'CAMBIO_DIGITAL', 'AJUSTE', 'TRANSFERENCIA', 'RETIRO'
    ));

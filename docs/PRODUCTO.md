# AdrithStore — Producto y alcance

## Definición

AdrithStore es un **sistema de gestión comercial e inventario para pequeños y medianos comercios**. Una bodega representa el caso mínimo de uso, pero el diseño busca escalar funcionalmente a minimarkets, tiendas de ropa, calzado y otros comercios con ventas, compras, stock, servicios y múltiples medios de pago.

No se define actualmente como ERP completo. El POS es un módulo del sistema.

## Usuarios objetivo

- Propietario/administrador.
- Vendedor/operador.
- Negocios con inventario por unidad o peso.
- Negocios que combinan productos y servicios.

## Módulos actuales

Ventas/POS; registro de ventas; productos y categorías; compras y proveedores; inventario y CPP; clientes; usuarios/roles; tesorería/cuentas; dashboard y analítica; servicios y comisiones.

## Principios del producto

1. Backend como fuente autoritativa de reglas y datos sensibles.
2. Frontend orientado a facilitar la operación, no a decidir costos o seguridad.
3. Históricos preservados: no recalcular operaciones pasadas con valores actuales.
4. Diferenciar inventario, actividad comercial y movimientos financieros.
5. Trazabilidad antes que correcciones silenciosas.

## En desarrollo / pendiente

El backlog actual incluye atomicidad de ventas/tesorería, concurrencia de inventario, ajustes y anulaciones, permisos sobre costos, costos autoritativos de servicios, revalorización, inventario inicial, transformación de productos y evolución del dashboard.

## Evolución posible

Sin comprometer el alcance actual, futuras versiones podrían incorporar cierres de caja más completos, cuentas por cobrar/pagar, reportes tributarios dedicados, conciliación financiera, documentos electrónicos e integraciones externas. Estas capacidades no deben considerarse implementadas hasta que exista código y criterio funcional aprobado.

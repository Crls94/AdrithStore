# AdrithStore — Esquema Completo de Base de Datos

> Generado desde entidades Java + DDL + repositorios  
> 17 tablas · PostgreSQL

---

## Índice de tablas

| # | Tabla | Tipo | Propósito |
|---|-------|:----:|-----------|
| 1 | `categorias` | Maestra | Categorías de productos (ej: Bebidas, SERVICIOS, TRANSFERENCIA) |
| 2 | `producto` | Maestra | Productos y servicios del inventario |
| 3 | `producto_unidad` | Detalle | Múltiples unidades de venta por producto (U, Docena, Caja) |
| 4 | `cliente` | Maestra | Clientes |
| 5 | `proveedores` | Maestra | Proveedores |
| 6 | `compra` | Transaccional | Órdenes de compra |
| 7 | `compra_detalle` | Detalle | Líneas de cada compra |
| 8 | `compra_ajuste` | Transaccional | Ajustes de costo/cantidad post-compra |
| 9 | `venta` | Transaccional | Ventas realizadas |
| 10 | `venta_detalle` | Detalle | Productos vendidos (BIEN_FISICO) |
| 11 | `venta_detalle_servicio` | Detalle | Servicios vendidos (SERVICIO_PURO / SERVICIO_COMIS) |
| 12 | `venta_pago` | Detalle | Desglose de pagos (efectivo, plin, yape, tarjeta, transferencia) |
| 13 | `cuenta_financiera` | Maestra | Cajas, billeteras digitales, cuentas bancarias |
| 14 | `transaccion_financiera` | Transaccional | Libro mayor: todos los movimientos de dinero |
| 15 | `periodo_contable` | Maestra | Períodos mensuales contables |
| 16 | `cierre_diario` | Transaccional | Cierres de caja diarios por cuenta |
| 17 | `evento_log` | Auditoría | Log de eventos del sistema |
| — | `sistema_config` | Config | Configuración del sistema (single row) |
| — | `usuario` | Seguridad | Usuarios del sistema |

---

## 1. `categorias`

| Columna | Tipo | PK | FK | Obligatorio | Default | Notas |
|---------|------|:--:|:--:|:-----------:|:-------:|-------|
| `id_categoria` | `SERIAL` | ✅ | | ✅ | | |
| `nombre` | `VARCHAR(120)` | | | ✅ UNIQUE | | |
| `descripcion` | `TEXT` | | | | | |

**Relaciones:** Ninguna  
**Seed:** 17 categorías (Abarrotes, Bebidas, SERVICIOS, IMPRESIONES, TRANSFERENCIA, etc.)

---

## 2. `producto`

| Columna | Tipo | PK | FK | Obligatorio | Default | Notas |
|---------|------|:--:|:--:|:-----------:|:-------:|-------|
| `id_producto` | `SERIAL` | ✅ | | ✅ | | |
| `id_categoria` | `INTEGER` | | `categorias(id_categoria)` | ✅ | | |
| `sku` | `VARCHAR(50)` | | | | UNIQUE | |
| `nombre` | `VARCHAR(250)` | | | ✅ | | |
| `descripcion` | `TEXT` | | | | | |
| `tipo` | `VARCHAR(20)` | | | ✅ | `'BIEN_FISICO'` | `CHECK` en (`BIEN_FISICO`, `SERVICIO_PURO`, `SERVICIO_COMIS`, `CONSUMIBLE`) |
| `visible_en_pos` | `BOOLEAN` | | | | `TRUE` | CONSUMIBLE → FALSE |
| `stock` | `INTEGER` | | | | `0` | |
| `precio_costo` | `DECIMAL(10,4)` | | | | `0` | |
| `porcentaje_costo` | `DECIMAL(5,2)` | | | | `NULL` | Solo IMPRESIONES: % costo sobre monto |
| `precio_venta` | `DECIMAL(10,2)` | | | | `0` | |
| `comision_base` | `DECIMAL(10,2)` | | | | `NULL` | Solo TRANSFERENCIA: S/1 |
| `comision_cada` | `DECIMAL(10,2)` | | | | `NULL` | Solo TRANSFERENCIA: cada S/100 |
| `stock_alert` | `INTEGER` | | | | `5` | |
| `cpp` | `DECIMAL(10,4)` | | | | `0` | Costo Promedio Ponderado |
| `permite_stock_negativo` | `BOOLEAN` | | | | `TRUE` | |
| `imagen_url` | `VARCHAR(500)` | | | | | |

**Relaciones:**
- `categoria` → `categorias` (`@ManyToOne EAGER`)

**Tipos de producto y su comportamiento:**

| Tipo | Stock | Costo | POS | Impuestos |
|------|:-----:|:-----:|:---:|:---:|
| `BIEN_FISICO` | ✅ controlado | ✅ > 0 requerido | ✅ visible | ✅ IGV |
| `SERVICIO_PURO` | ❌ sin stock | ✅ >= 0 | ✅ 1 item | ✅ IGV |
| `SERVICIO_COMIS` | ❌ sin stock | ✅ >= 0 | ✅ multi item | ✅ IGV |
| `CONSUMIBLE` | ✅ controlado | ✅ > 0 requerido | ❌ oculto | ❌ No aplica |

---

## 3. `producto_unidad`

| Columna | Tipo | PK | FK | Obligatorio | Default | Notas |
|---------|------|:--:|:--:|:-----------:|:-------:|-------|
| `id_unidad` | `SERIAL` | ✅ | | ✅ | | |
| `id_producto` | `INTEGER` | | `producto(id_producto)` ON DELETE CASCADE | ✅ | | |
| `nombre_unidad` | `VARCHAR(80)` | | | ✅ | | "Unidad", "Docena", "Caja x24" |
| `unidad` | `INTEGER` | | | ✅ | | Factor: 1, 12, 24... |
| `medida` | `VARCHAR(20)` | | | | | "U", "Caj", "Bot" |
| `precio_venta` | `DECIMAL(10,2)` | | | | | |

**Unique:** `(id_producto, nombre_unidad)`  
**Relaciones:** `producto` → `producto` (`@ManyToOne LAZY`, `@JsonIgnore`)

---

## 4. `cliente`

| Columna | Tipo | PK | FK | Obligatorio | Default | Notas |
|---------|------|:--:|:--:|:-----------:|:-------:|-------|
| `id_cliente` | `SERIAL` | ✅ | | ✅ | | |
| `nombre` | `VARCHAR(100)` | | | | | |
| `apellido` | `VARCHAR(100)` | | | | | |
| `dni` | `VARCHAR(15)` | | | | | |
| `telefono` | `VARCHAR(15)` | | | | | |

**Relaciones:** Ninguna

---

## 5. `proveedores`

| Columna | Tipo | PK | FK | Obligatorio | Default | Notas |
|---------|------|:--:|:--:|:-----------:|:-------:|-------|
| `id_proveedor` | `SERIAL` | ✅ | | ✅ | | |
| `empresa` | `VARCHAR(150)` | | | ✅ UNIQUE | | |
| `ruc` | `VARCHAR(11)` | | | | UNIQUE | |
| `descripcion` | `TEXT` | | | | | |
| `emite_percepcion` | `BOOLEAN` | | | | `FALSE` | |
| `telefono` | `VARCHAR(20)` | | | | | |
| `contacto` | `VARCHAR(150)` | | | | | |
| `email` | `VARCHAR(150)` | | | | | |

**Relaciones:** Ninguna

---

## 6. `compra`

| Columna | Tipo | PK | FK | Obligatorio | Default | Notas |
|---------|------|:--:|:--:|:-----------:|:-------:|-------|
| `id_compra` | `SERIAL` | ✅ | | ✅ | | |
| `id_proveedor` | `INTEGER` | | `proveedores(id_proveedor)` | ✅ | | |
| `tipo_comprobante` | `VARCHAR(20)` | | | | | |
| `serie_comprobante` | `VARCHAR(20)` | | | | | |
| `fecha` | `TIMESTAMP` | | | | `CURRENT_TIMESTAMP` | |
| `estado` | `VARCHAR(20)` | | | | `'confirmado'` | |
| `motivo` | `TEXT` | | | | | |
| `subtotal` | `DECIMAL(10,2)` | | | | `0` | |
| `descuento_global` | `DECIMAL(10,2)` | | | | `0` | |
| `percepcion` | `DECIMAL(10,2)` | | | | `0` | |
| `total` | `DECIMAL(10,2)` | | | | `0` | |

**Relaciones:**
- `proveedor` → `proveedores` (`@ManyToOne EAGER`)
- `detalles` → `compra_detalle` (`@OneToMany EAGER`, cascade ALL, orphanRemoval)

**Queries disponibles:**
- `findAllByOrderByFechaDesc()` — todas las compras
- `findByEstadoOrderByFechaDesc(String estado)` — filtrar por estado

---

## 7. `compra_detalle`

| Columna | Tipo | PK | FK | Obligatorio | Default | Notas |
|---------|------|:--:|:--:|:-----------:|:-------:|-------|
| `id_compra_detalle` | `SERIAL` | ✅ | | ✅ | | |
| `id_compra` | `INTEGER` | | `compra(id_compra)` | ✅ | | |
| `id_producto` | `INTEGER` | | `producto(id_producto)` | ✅ | | |
| `id_unidad` | `INTEGER` | | `producto_unidad(id_unidad)` | | | |
| `cantidad` | `INTEGER` | | | ✅ | `1` | |
| `costo_unitario` | `DECIMAL(10,4)` | | | ✅ | | |
| `costo_anterior` | `DECIMAL(10,4)` | | | | | CPP antes de esta compra |
| `descuento_pct` | `DECIMAL(5,2)` | | | | `0` | |
| `subtotal` | `DECIMAL(10,2)` | | | ✅ | | |
| `vencimiento` | `DATE` | | | | | |

**Relaciones:**
- `compra` → `compra` (`@ManyToOne LAZY`, `@JsonIgnore`)
- `producto` → `producto` (`@ManyToOne EAGER`)
- `unidad` → `producto_unidad` (`@ManyToOne EAGER`)

---

## 8. `compra_ajuste`

| Columna | Tipo | PK | FK | Obligatorio | Default | Notas |
|---------|------|:--:|:--:|:-----------:|:-------:|-------|
| `id_ajuste` | `SERIAL` | ✅ | | ✅ | | |
| `id_compra_original` | `INTEGER` | | `compra(id_compra)` | ✅ | | |
| `id_producto` | `INTEGER` | | `producto(id_producto)` | ✅ | | |
| `fecha` | `TIMESTAMP` | | | | `NOW()` | |
| `tipo` | `VARCHAR(30)` | | | ✅ | | `COSTO` / `CANTIDAD` / `DEVOLUCION` |
| `motivo` | `TEXT` | | | ✅ | | |
| `delta_cantidad` | `INTEGER` | | | | `0` | |
| `costo_anterior` | `DECIMAL(10,4)` | | | | | |
| `costo_nuevo` | `DECIMAL(10,4)` | | | | | |
| `cpp_resultante` | `DECIMAL(10,4)` | | | | | |
| `impacto_stock` | `INTEGER` | | | | `0` | |

**Relaciones:**
- `compraOriginal` → `compra` (`@ManyToOne EAGER`)
- `producto` → `producto` (`@ManyToOne EAGER`)

---

## 9. `venta`

| Columna | Tipo | PK | FK | Obligatorio | Default | Notas |
|---------|------|:--:|:--:|:-----------:|:-------:|-------|
| `id_venta` | `SERIAL` | ✅ | | ✅ | | |
| `id_cliente` | `INTEGER` | | `cliente(id_cliente)` | ✅ | | |
| `id_usuario` | `INTEGER` | | `usuario(id_usuario)` | ✅ | | |
| `tipo_comprobante` | `VARCHAR(20)` | | | | | `Boleta` / `Factura` |
| `serie_comprobante` | `VARCHAR(4)` | | | | | |
| `fecha` | `TIMESTAMP` | | | | `CURRENT_TIMESTAMP` | |
| `medio_pago` | `VARCHAR(20)` | | | | | Primer método de pago |
| `estado` | `VARCHAR(20)` | | | | `'confirmado'` | |
| `motivo` | `TEXT` | | | | | Motivo si está anulado |
| `subtotal` | `DECIMAL(10,2)` | | | | | `total / 1.18` |
| `igv` | `DECIMAL(10,2)` | | | | | `total - subtotal` |
| `descuento_global` | `DECIMAL(10,2)` | | | | `0` | |
| `total` | `DECIMAL(10,2)` | | | | | |

**Índices:** `(fecha)`, `(estado)`

**Relaciones:**
- `cliente` → `cliente` (`@ManyToOne EAGER`)
- `usuario` → `usuario` (`@ManyToOne EAGER`)
- `detalles` → `venta_detalle` (`@OneToMany EAGER`, cascade ALL, orphanRemoval)
- `pagos` → `venta_pago` (`@OneToMany LAZY`, cascade ALL, orphanRemoval)
- `detallesServicio` → `venta_detalle_servicio` (`@OneToMany LAZY`, cascade ALL, orphanRemoval)

**Queries disponibles:**
- `findAllByOrderByFechaDesc()` — todas con pagos + cliente + usuario (JOIN FETCH)
- `findByUsuario_IdUsuarioOrderByFechaDesc(Integer idUsuario)` — por vendedor
- `findByCliente_IdClienteOrderByFechaDesc(Integer idCliente)` — por cliente
- `findByFechaBetweenAndEstado(LocalDateTime desde, LocalDateTime hasta, String estado)` — rango + estado
- `sumCostosEntreFechas(LocalDateTime desde, LocalDateTime hasta)` — suma costos
- `findByUsuarioAndFecha(Integer idUsuario, LocalDateTime desde, LocalDateTime hasta)` — vendedor + rango

---

## 10. `venta_detalle`

| Columna | Tipo | PK | FK | Obligatorio | Default | Notas |
|---------|------|:--:|:--:|:-----------:|:-------:|-------|
| `id_venta_detalle` | `SERIAL` | ✅ | | ✅ | | |
| `id_venta` | `INTEGER` | | `venta(id_venta)` | ✅ | | |
| `id_producto` | `INTEGER` | | `producto(id_producto)` | ✅ | | |
| `id_unidad` | `INTEGER` | | `producto_unidad(id_unidad)` | | | |
| `cantidad` | `INTEGER` | | | ✅ | | |
| `precio_historico` | `DECIMAL(10,2)` | | | ✅ | | Precio al momento de la venta |
| `costo_historico` | `DECIMAL(10,4)` | | | ✅ | | CPP al momento de la venta |
| `descuento_item` | `DECIMAL(10,2)` | | | | `0` | |
| `subtotal` | `DECIMAL(10,2)` | | | ✅ | | `(precio × cantidad) - descuento` |

**Relaciones:**
- `venta` → `venta` (`@ManyToOne LAZY`)
- `producto` → `producto` (`@ManyToOne EAGER`)

---

## 11. `venta_detalle_servicio`

| Columna | Tipo | PK | FK | Obligatorio | Default | Notas |
|---------|------|:--:|:--:|:-----------:|:-------:|-------|
| `id_venta_detalle_servicio` | `SERIAL` | ✅ | | ✅ | | |
| `id_venta` | `INTEGER` | | `venta(id_venta)` | ✅ | | Relación directa a venta |
| `id_producto` | `INTEGER` | | `producto(id_producto)` | ✅ | | |
| `descripcion` | `TEXT` | | | | | |
| `monto` | `DECIMAL(10,2)` | | | ✅ | `0` | Monto cobrado / operación |
| `costo` | `DECIMAL(10,4)` | | | | `0` | Costo del servicio |
| `comision` | `DECIMAL(10,2)` | | | | `0` | Solo SERVICIO_COMIS |
| `origen` | `VARCHAR(100)` | | | | | Cuenta origen (TRANSFERENCIA) |
| `destino` | `VARCHAR(100)` | | | | | Cuenta destino (TRANSFERENCIA) |
| `subtotal` | `DECIMAL(10,2)` | | | ✅ | `0` | `monto + comision` |

**Relaciones:**
- `venta` → `venta` (`@ManyToOne LAZY`)
- `producto` → `producto` (`@ManyToOne EAGER`)

---

## 12. `venta_pago`

| Columna | Tipo | PK | FK | Obligatorio | Default | Notas |
|---------|------|:--:|:--:|:-----------:|:-------:|-------|
| `id_pago` | `SERIAL` | ✅ | | ✅ | | |
| `id_venta` | `INTEGER` | | `venta(id_venta)` ON DELETE CASCADE | ✅ | | |
| `medio_pago` | `VARCHAR(50)` | | | ✅ | | `efectivo` / `plin` / `yape` / `tarjeta` / `transferencia` |
| `monto` | `DECIMAL(10,2)` | | | ✅ | | |

**Índice:** `(id_venta)`  
**Relaciones:** `venta` → `venta` (`@ManyToOne LAZY`, `@JsonIgnore`)

**Queries disponibles:**
- `findByVenta_IdVenta(Integer idVenta)`
- `sumByMedioPagoBetweenFechas(LocalDateTime desde, LocalDateTime hasta)` — agrupado por medio de pago

---

## 13. `cuenta_financiera`

| Columna | Tipo | PK | FK | Obligatorio | Default | Notas |
|---------|------|:--:|:--:|:-----------:|:-------:|-------|
| `id_cuenta` | `SERIAL` | ✅ | | ✅ | | |
| `nombre` | `VARCHAR(100)` | | | ✅ | | "Caja Fisica", "Plin", "Yape", etc. |
| `tipo` | `VARCHAR(20)` | | | ✅ | | `CHECK` en (`EFECTIVO`, `DIGITAL`, `BANCO`) |
| `descripcion` | `TEXT` | | | | | |
| `saldo_actual` | `DECIMAL(12,2)` | | | | `0` | Calculado por `TesoreriaService.recalcular()` |
| `fondo_caja` | `DECIMAL(12,2)` | | | | `0` | Monto a dejar al cerrar el día |
| `activa` | `BOOLEAN` | | | | `TRUE` | |

**Relaciones:** Ninguna

**Queries disponibles:**
- `findByActivaTrue()`
- `findByNombreIgnoreCase(String nombre)` — `Optional`
- `findAllByNombreIgnoreCase(String nombre)` — `List`
- `findByActivaTrueWithLock()` — con `PESSIMISTIC_WRITE` lock

---

## 14. `transaccion_financiera`

| Columna | Tipo | PK | FK | Obligatorio | Default | Notas |
|---------|------|:--:|:--:|:-----------:|:-------:|-------|
| `id_transaccion` | `SERIAL` | ✅ | | ✅ | | |
| `fecha` | `TIMESTAMP` | | | | `NOW()` | |
| `tipo_mov` | `VARCHAR(30)` | | | ✅ | | `CHECK` en (`APERTURA`, `VENTA`, `COMPRA`, `GASTO`, `CAMBIO_DIGITAL`, `AJUSTE`, `TRANSFERENCIA`, `RETIRO`) |
| `id_cuenta` | `INTEGER` | | `cuenta_financiera(id_cuenta)` | ✅ | | |
| `monto` | `DECIMAL(10,2)` | | | ✅ | | `CHECK monto >= 0` |
| `signo` | `SMALLINT` | | | ✅ | | `CHECK` en (`1`, `-1`) · +1=entrada, -1=salida |
| `concepto` | `TEXT` | | | | | |
| `id_venta` | `INTEGER` | | `venta(id_venta)` | | | FK opcional |
| `id_compra` | `INTEGER` | | `compra(id_compra)` | | | FK opcional |
| `periodo` | `VARCHAR(7)` | | | | | `'YYYY-MM'` |
| `creada_por` | `VARCHAR(50)` | | | | | |

**Índices:** `(id_cuenta, periodo)`, `(fecha)`, `(tipo_mov)`

**Relaciones:**
- `cuenta` → `cuenta_financiera` (`@ManyToOne EAGER`)

**Queries disponibles:**
- `findByPeriodoOrderByFechaDesc(String periodo)`
- `findByFechaBetweenOrderByFechaDesc(LocalDateTime desde, LocalDateTime hasta)`
- `findByCuenta_IdCuentaAndPeriodoOrderByFechaDesc(Integer idCuenta, String periodo)`
- `findByVentaId(Integer idVenta)`
- `calcularSaldoTotal(Integer idCuenta)` — `SUM(monto * signo)`
- `sumEgresosEntreFechas(LocalDateTime desde, LocalDateTime hasta)` — GASTO + signo=-1
- `sumByTipoMovAndPeriodo(String periodo)` — agrupado por tipo_mov
- `findByCuentaAndFecha(Integer idCuenta, LocalDateTime desde, LocalDateTime hasta)`
- `findByFechaAfterOrderByFechaDesc(LocalDateTime desde)`

---

## 15. `periodo_contable`

| Columna | Tipo | PK | FK | Obligatorio | Default | Notas |
|---------|------|:--:|:--:|:-----------:|:-------:|-------|
| `id_periodo` | `SERIAL` | ✅ | | ✅ | | |
| `periodo` | `VARCHAR(7)` | | | ✅ UNIQUE | | `'YYYY-MM'` |
| `fecha_apertura` | `TIMESTAMP` | | | | `NOW()` | |
| `estado` | `VARCHAR(20)` | | | | `'abierto'` | `CHECK` en (`abierto`, `cerrado`) |
| `notas` | `TEXT` | | | | | |

**Relaciones:** Ninguna

---

## 16. `cierre_diario`

| Columna | Tipo | PK | FK | Obligatorio | Default | Notas |
|---------|------|:--:|:--:|:-----------:|:-------:|-------|
| `id_cierre` | `SERIAL` | ✅ | | ✅ | | |
| `fecha_cierre` | `DATE` | | | ✅ | | |
| `id_cuenta` | `INTEGER` | | `cuenta_financiera(id_cuenta)` | ✅ | | |
| `saldo_sistema` | `DECIMAL(12,2)` | | | ✅ | | Lo que dice el sistema |
| `saldo_contado` | `DECIMAL(12,2)` | | | ✅ | | Lo que contó el cajero |
| `diferencia` | `DECIMAL(12,2)` | | | ✅ | | `contado - sistema` |
| `fondo_dejado` | `DECIMAL(12,2)` | | | ✅ | | Fondo de caja configurado |
| `retiro` | `DECIMAL(12,2)` | | | ✅ | | `contado - fondo` |
| `ajuste_registrado` | `BOOLEAN` | | | | `FALSE` | |
| `observacion` | `TEXT` | | | | | |
| `cerrado_por` | `VARCHAR(50)` | | | | | |
| `cerrado_en` | `TIMESTAMP` | | | | `NOW()` | |
| `estado` | `VARCHAR(20)` | | | | `'cerrado'` | |

**Unique:** `(fecha_cierre, id_cuenta)`  
**Relaciones:** `cuenta` → `cuenta_financiera` (`@ManyToOne EAGER`)

**Queries disponibles:**
- `findByFechaCierreOrderByIdCierre(LocalDate fecha)`
- `findByFechaCierreAndCuenta_IdCuenta(LocalDate fecha, Integer idCuenta)` — `Optional`
- `findByFechaCierreBetweenOrderByFechaCierreDesc(LocalDate desde, LocalDate hasta)`

---

## 17. `evento_log`

| Columna | Tipo | PK | FK | Obligatorio | Default | Notas |
|---------|------|:--:|:--:|:-----------:|:-------:|-------|
| `id_evento` | `SERIAL` | ✅ | | ✅ | | |
| `fecha` | `TIMESTAMP` | | | | `CURRENT_TIMESTAMP` | |
| `tipo_evento` | `VARCHAR(60)` | | | ✅ | | |
| `entidad` | `VARCHAR(30)` | | | | | `VENTA`, `COMPRA`, `PRODUCTO`, etc. |
| `id_entidad` | `INTEGER` | | | | | |
| `descripcion` | `TEXT` | | | | | |
| `datos_json` | `TEXT` | | | | | |

**Índice:** `(fecha)`  
**Relaciones:** Ninguna

**Queries disponibles:**
- `findTop100ByOrderByFechaDesc()`
- `findAllByOrderByFechaDesc()`
- `findByTipoEventoOrderByFechaDesc(String tipo)`
- `findByEntidadAndIdEntidadOrderByFechaDesc(String entidad, Integer idEntidad)`

---

## Tablas auxiliares

### `usuario`

| Columna | Tipo | PK | FK | Obligatorio | Default | Notas |
|---------|------|:--:|:--:|:-----------:|:-------:|-------|
| `id_usuario` | `SERIAL` | ✅ | | ✅ | | |
| `username` | `VARCHAR(50)` | | | ✅ UNIQUE | | |
| `password_hash` | `VARCHAR(255)` | | | ✅ | | |
| `rol` | `VARCHAR(20)` | | | ✅ | `'VENDEDOR'` | `ADMIN` / `VENDEDOR` |
| `nombres` | `VARCHAR(100)` | | | ✅ | | |
| `apellidos` | `VARCHAR(100)` | | | ✅ | | |
| `dni` | `VARCHAR(15)` | | | | UNIQUE | |
| `telefono` | `VARCHAR(20)` | | | | | |
| `activo` | `BOOLEAN` | | | | `TRUE` | |
| `fecha_creacion` | `TIMESTAMP` | | | | `NOW()` | |
| `creado_por` | `VARCHAR(50)` | | | | | |

### `sistema_config`

| Columna | Tipo | PK | FK | Obligatorio | Default | Notas |
|---------|------|:--:|:--:|:-----------:|:-------:|-------|
| `id` | `INTEGER` | ✅ | | ✅ | `1` | Single-row pattern |
| `configurado` | `BOOLEAN` | | | | `FALSE` | |
| `nombre_negocio` | `VARCHAR(200)` | | | | | |
| `fecha_setup` | `TIMESTAMP` | | | | | |

---

## Diagrama de relaciones principales

```
categorias ──┐
              ├── producto ─── producto_unidad
proveedores ──┤
              └── compra ─── compra_detalle ──── compra_ajuste

cliente ──┐
          ├── venta ─── venta_detalle
usuario ──┘         ├── venta_detalle_servicio
                    └── venta_pago

cuenta_financiera ─── transaccion_financiera ─── (id_venta → venta)
                   └── cierre_diario               (id_compra → compra)

periodo_contable (independiente, referenciado por periodo string)
evento_log (independiente, auditoría)
```

---

## Datos semilla (productos)

| Categoría | Productos | Tipo |
|-----------|-----------|:----:|
| SERVICIOS | Servicios General (S/0.50) | `SERVICIO_PURO` |
| IMPRESIONES | Impresiones/Fotocopia (S/0.50, 75% costo) | `SERVICIO_PURO` |
| TRANSFERENCIA | Transferencia/Pagos (S/1.00, comisión S/1 c/100) | `SERVICIO_COMIS` |
| Utiles de oficina | Fastener, Folder, Lapiceros, etc. (~30 items) | `BIEN_FISICO` |
| Abarrotes | Arroz, Azúcar, Aceite, Fideos, etc. (~30 items) | `BIEN_FISICO` |
| Bebidas | Varias | `BIEN_FISICO` |
| Varios | Chip Movistar (antiguo servicio), snacks, etc. | `BIEN_FISICO` |
| +10 categorías más | ~340 productos | `BIEN_FISICO` |

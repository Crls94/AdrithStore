# Reporte Detallado (Nivel 2) — Especificación de Tabs

> AdrithStore — Página de Reportes
> Cada tab corresponde a una tabla o grupo de tablas relacionadas.
> Filtro de fecha compartido arriba (desde–hasta), aplicado a todos los tabs que tengan campo `fecha`.
> Exportación independiente por tab: Excel / CSV / PDF / HTML.
>
> **Actualización:** se revirtió la decisión original de reusar el Dashboard como "Nivel 1". El Dashboard es
> una interfaz operativa interactiva (POS/tesorería en vivo), no un reporte — así que `Reportes.jsx` ahora
> tiene su propio selector de dos niveles: **Ejecutivo** (Nivel 1, resumen tipo KPIs — hoy es un placeholder,
> el contenido real se define después) y **Detallado** (Nivel 2, todo lo documentado en este archivo: los 11
> tabs con filtro de fecha, tablas y exportación).

---

## Decisiones de arquitectura

| Tema | Decisión |
|---|---|
| **Backend** | Un `ReportesController` centralizado (`/api/reportes/**`), no se extiende cada controller de dominio. Ahí vive el filtro de fecha, la paginación y la restricción de rol. |
| **Paginación** | Server-side (`page`/`size` + rango de fechas) desde el arranque en las tablas que más crecen: Ventas, Compras, Movimientos de Tesorería. El resto de tabs (snapshots o volumen bajo) puede traer todo el rango filtrado sin paginar. |
| **Exportación** | Todo se genera en el **frontend**, sobre los datos ya cargados en la página actual (no sobre todo el rango sin paginar). PDF reusa `jsPDF` (ya instalado). Excel usa una librería nueva (`xlsx`/SheetJS). CSV se arma como string plano. "HTML" = vista imprimible (`window.print()` con CSS de impresión), no un archivo `.html` descargable aparte. |
| **Ordenamiento** | Columnas clickeables para ordenar asc/desc; no queda fijo por fecha desc. |
| **Fila de totales** | Cada tab con columnas numéricas muestra una fila de resumen (suma) del rango filtrado actual, no solo de la página visible. |

---

## Roles

| Rol | Tabs visibles |
|---|---|
| **VENDEDOR** | Solo Tab 1 (Ventas), filtrado a sus propias ventas (`id_usuario` = usuario logueado). El filtro se fuerza en el backend, no solo en el frontend — es el único tab de Reportes que valida rol server-side. Además, no ve `costo_historico`/CPP en el detalle expandible (mismo criterio que ya usa `Dashboard.jsx`, donde `DashVendedor` nunca muestra costos ni margen). |
| **ADMIN** | Todos los tabs, sin restricciones. |

---

## Tab 1 — Ventas
**Tablas:** `venta` (+ expandible `venta_detalle`, `venta_detalle_servicio`, `venta_pago`)

| Columna | Origen |
|---|---|
| Fecha | `venta.fecha` |
| N° Comprobante | `tipo_comprobante` + `serie_comprobante` |
| Cliente | `cliente.nombre + apellido` |
| Vendedor | `usuario.nombres` (oculto para rol VENDEDOR) |
| Medio de pago | `venta.medio_pago` ("Mixto" si hay >1 en `venta_pago`) |
| Subtotal / IGV / Descuento / Total | `venta.subtotal, igv, descuento_global, total` |
| Estado | `venta.estado` |

**Detalle expandible por fila:** productos (`venta_detalle`) y servicios (`venta_detalle_servicio`) de esa venta, más desglose de pagos (`venta_pago`) si es mixto.

**Filtros propios:** por cliente, por vendedor (solo admin), por estado.

---

## Tab 2 — Compras
**Tablas:** `compra` (+ expandible `compra_detalle`)

| Columna | Origen |
|---|---|
| Fecha | `compra.fecha` |
| Proveedor | `proveedores.empresa` |
| Comprobante | `tipo_comprobante + serie_comprobante` |
| Subtotal / Descuento / Percepción / Total | `compra.*` |
| Estado | `compra.estado` |
| Motivo | `compra.motivo` |

**Detalle expandible:** `compra_detalle` (producto, cantidad, costo unitario, vencimiento).

**Filtros propios:** por proveedor, por estado.

---

## Tab 3 — Ajustes de Compra
**Tabla:** `compra_ajuste`

| Columna | Origen |
|---|---|
| Fecha | `fecha` |
| Compra original | `id_compra_original` (link a Tab 2) |
| Producto | `producto.nombre` (join) |
| Tipo | `tipo` (COSTO / CANTIDAD / DEVOLUCION) |
| Motivo | `motivo` |
| Δ Cantidad | `delta_cantidad` |
| Costo anterior → nuevo | `costo_anterior`, `costo_nuevo` |
| CPP resultante | `cpp_resultante` |
| Impacto en stock | `impacto_stock` |

**Filtros propios:** por tipo de ajuste.

---

## Tab 4 — Movimientos de Tesorería
**Tabla:** `transaccion_financiera`

| Columna | Origen |
|---|---|
| Fecha | `fecha` |
| Tipo | `tipo_mov` |
| Cuenta | `cuenta_financiera.nombre` (join) |
| Monto | `monto` (color según `signo`: verde entrada / rojo salida) |
| Concepto | `concepto` |
| Referencia | si `id_venta`/`id_compra` no nulo → link a Tab 1/2 |
| Registrado por | `creada_por` |

**Filtros propios:** por `tipo_mov`, por cuenta.

---

## Tab 5 — Cierres de Caja
**Tabla:** `cierre_diario`

| Columna | Origen |
|---|---|
| Fecha cierre | `fecha_cierre` |
| Cuenta | `cuenta_financiera.nombre` |
| Saldo sistema / contado | `saldo_sistema`, `saldo_contado` |
| Diferencia | `diferencia` (resaltar en rojo si ≠ 0) |
| Retiro | `retiro` |
| Ajuste registrado | `ajuste_registrado` (badge sí/no) |
| Cerrado por | `cerrado_por` |
| Observación | `observacion` |

---

## Tab 6 — Inventario / Productos
**Tablas:** `producto` (+ `producto_unidad`, `categorias`)

| Columna | Origen |
|---|---|
| SKU | `sku` |
| Nombre | `nombre` |
| Categoría | `categorias.nombre` (join) |
| Tipo | `tipo` (BIEN_FISICO / SERVICIO_PURO / SERVICIO_COMIS / CONSUMIBLE) |
| Stock actual | `stock` |
| Alerta de stock | `stock_alert` (resaltar fila si `stock <= stock_alert`) |
| Precio costo (CPP) | `cpp` |
| Precio venta | `precio_venta` |
| Visible en POS | `visible_en_pos` |

**No lleva filtro de fecha** (es una foto del estado actual, no histórico).
**Filtros propios:** por categoría, por tipo, checkbox "solo stock bajo".

---

## Tab 7 — Clientes
**Tabla:** `cliente` (+ resumen agregado de `venta`)

| Columna | Origen |
|---|---|
| Nombre / Apellido | `cliente.*` |
| DNI | `dni` |
| Teléfono | `telefono` |
| N° Compras | `COUNT(venta)` por cliente |
| Total comprado | `SUM(venta.total)` por cliente |
| Última compra | `MAX(venta.fecha)` |

**Filtro de fecha:** aplica solo a las columnas agregadas (N° compras, total, última compra dentro del rango).

---

## Tab 8 — Proveedores
**Tabla:** `proveedores` (+ resumen agregado de `compra`)

| Columna | Origen |
|---|---|
| Empresa | `empresa` |
| RUC | `ruc` |
| Contacto / Teléfono / Email | `contacto`, `telefono`, `email` |
| Emite percepción | `emite_percepcion` |
| N° Compras | `COUNT(compra)` por proveedor |
| Total comprado | `SUM(compra.total)` por proveedor |
| Última compra | `MAX(compra.fecha)` |

---

## Tab 9 — Cuentas Financieras
**Tabla:** `cuenta_financiera`

| Columna | Origen |
|---|---|
| Nombre | `nombre` |
| Tipo | `tipo` (EFECTIVO / DIGITAL / BANCO) |
| Saldo actual | `saldo_actual` |
| Fondo de caja | `fondo_caja` |
| Activa | `activa` |

**No lleva filtro de fecha** (es estado actual). Complementa al Tab 4 (movimientos) — este es el resumen, aquel es el detalle.

---

## Tab 10 — Usuarios (Solo ADMIN)
**Tabla:** `usuario` (+ resumen agregado de `venta`)

| Columna | Origen |
|---|---|
| Nombre completo | `nombres + apellidos` |
| Usuario | `username` |
| Rol | `rol` (ADMIN / VENDEDOR) |
| Activo | `activo` |
| Fecha creación | `fecha_creacion` |
| N° Ventas (en rango) | `COUNT(venta)` por usuario |
| Total vendido (en rango) | `SUM(venta.total)` por usuario |

**Uso:** ranking de desempeño por vendedor, además de administración de cuentas.

---

## Tab 11 — Log de Eventos / Auditoría (Solo ADMIN)
**Tabla:** `evento_log`

| Columna | Origen |
|---|---|
| Fecha | `fecha` |
| Tipo evento | `tipo_evento` |
| Entidad | `entidad + id_entidad` |
| Descripción | `descripcion` |

**Filtros propios:** por tipo de evento, por entidad.
**Nota:** usar `findTop100ByOrderByFechaDesc()` como default (no cargar todo el historial de una), con opción de rango de fecha explícito para ver más atrás.

---

## Tabla NO incluida como tab propio

- `periodo_contable` — no amerita tab de reporte; es config interna que ya se refleja en Tab 5 (Cierres de Caja) vía el campo `periodo`.
- `sistema_config` — single-row, configuración, no dato reportable.

---

## Orden de implementación sugerido

1. Tab 1 (Ventas) — ya tiene el mayor contexto previo.
2. Tab 4 (Movimientos de Tesorería) y Tab 5 (Cierres de Caja) — datos críticos ya trabajados.
3. Tab 2 (Compras) y Tab 3 (Ajustes de Compra).
4. Tab 6 (Inventario), Tab 9 (Cuentas Financieras) — snapshots de estado actual, sin filtro de fecha, más simples.
5. Tab 7 (Clientes), Tab 8 (Proveedores) — requieren queries agregadas nuevas (`COUNT`, `SUM`, `MAX` por relación).
6. Tab 10 (Usuarios) — requiere agregación similar a Clientes/Proveedores.
7. Tab 11 (Log de Eventos) — el más simple, dejar al final.

---

## Plan de Implementación Técnica

Esta sección es la guía de implementación para el agente que va a escribir el código. No hay que volver a diseñar nada — las decisiones de arquitectura ya están tomadas arriba; acá está el cómo, tab por tab.

### ⚠️ Errores a evitar

Un intento previo de plan (de otro agente) propuso estas 3 cosas — **ninguna de las tres se debe implementar así**, porque contradicen decisiones ya tomadas o reintroducen un problema técnico ya identificado:

1. **No poner la ruta `/reportes` ni el link de nav detrás de `soloAdmin`/"solo ADMIN".** Tab 1 (Ventas) debe ser visible para VENDEDOR (ver sección "Roles" arriba). La restricción de los otros 10 tabs se maneja *dentro* de la página (deshabilitando esos tabs en el shell, como ya hace `Tesoreria.jsx`), no bloqueando el acceso a toda la ruta.
2. **No generar los exports en el backend** (nada de `ExportService.java`, Apache POI, iText, Flying Saucer, ni un endpoint `/export?formato=`). La exportación es 100% frontend, sobre los datos ya cargados en pantalla — ver fila "Exportación" en "Decisiones de arquitectura" arriba.
3. **No usar `JOIN FETCH` de `venta_detalle`/`venta_pago`/`venta_detalle_servicio` en la query paginada de Ventas.** Combinar `JOIN FETCH` de colecciones con `Pageable` multiplica filas (Cartesian product) y rompe la paginación. Ver el detalle exacto de cómo evitarlo en la especificación de Tab 1 más abajo.

La paginación se mantiene **page/size clásico** (párametros `page`/`size`, respuesta con `totalElements`/`totalPages`, controles "Anterior/Siguiente" en el frontend) — no scroll infinito.

### Archivos a crear

**Backend**
- `BACKEND/src/main/java/com/AdrithStore/backend/controller/ReportesController.java` — `@RequestMapping("/api/reportes")`, un método `@GetMapping` por tab. Sin capa de servicio nueva (el proyecto no la usa para ningún dominio salvo `LogService`/`TesoreriaService`) — inyecta directamente los repositorios existentes, mismo patrón "fat controller" que `VentaController`/`CompraController`.

**Frontend**
- `FRONTEND/src/api/reportesApi.js` — wrapper de `axiosConfig`, mismo patrón que `FRONTEND/src/api/ventasApi.js` (una función por endpoint de `ReportesController`).
- `FRONTEND/src/pages/Reportes.jsx` — página principal.
- `FRONTEND/src/components/reportes/FiltroFecha.jsx` — filtro de fecha compartido (botones rápidos hoy/semana/mes/año + inputs desde–hasta libres).
- `FRONTEND/src/components/reportes/TablaReporte.jsx` — tabla reusable: headers ordenables, fila de totales (`<tfoot>`), paginación.
- `FRONTEND/src/components/reportes/ExportButtons.jsx` — botones Excel/CSV/PDF/HTML reusables, reciben `data` + definición de columnas.

**Frontend — modificar**
- `FRONTEND/src/App.jsx` — agregar `<Route path="/reportes" element={<Reportes />} />` dentro del bloque `<PrivateRoute><Layout /></PrivateRoute>` (sin `soloAdmin`: Tab 1 es accesible a VENDEDOR).
- `FRONTEND/src/components/layout/Layout.jsx` — agregar link de nav "Reportes" (sin `admin:true`), mismo array de items que ya usa para "Usuarios"/"Log Eventos".
- `FRONTEND/package.json` — agregar dependencia `xlsx` (SheetJS) para exportar a Excel.

### Patrón genérico de endpoint

```
GET /api/reportes/{tab}?desde=&hasta=&page=&size=&sort=&dir=&idUsuario=&rol=&...filtros propios del tab
```

- `idUsuario` + `rol` van en cada request (tomados del `usuario` de `AuthContext` en el frontend) para que el backend pueda aplicar la restricción de rol de Tab 1 sin depender de que el frontend "se porte bien" — es el único punto de `ReportesController` que valida rol server-side (el resto del proyecto no lo hace; ver nota en `CLAUDE.md` sobre ausencia de Spring Security).
- Tabs paginados (Ventas, Compras, Movimientos de Tesorería) devuelven:
  ```json
  { "content": [...], "totalElements": 0, "totalPages": 0, "totales": { "total": 0, "igv": 0, "descuento": 0 } }
  ```
  `totales` se calcula con una query de agregación aparte sobre el mismo filtro **sin paginar** (no sumar solo la página visible).
- Tabs sin paginar (el resto) devuelven `{ "content": [...], "totales": {...} }` sin `totalElements`/`totalPages`.
- **Cuidado con `JOIN FETCH` + `Pageable`:** `Venta.detalles` es `@OneToMany EAGER` y `pagos`/`detallesServicio` son `LAZY`. Las queries paginadas **no deben** usar `JOIN FETCH` sobre esas colecciones (multiplica filas y rompe la paginación) — dejar que Hibernate resuelva `detalles` EAGER por fila normalmente, y que `pagos`/`detallesServicio` se carguen LAZY al serializar dentro de la misma transacción `@Transactional(readOnly = true)` del método del controller.
- **Filtros opcionales en JPQL:** usar el patrón `(:param IS NULL OR campo = :param)` para que un mismo método de repositorio sirva con o sin cada filtro, en vez de crear una query por combinación.

### Backend — detalle por tab

**Tab 1 — Ventas** · `GET /api/reportes/ventas`
- Params: `desde`, `hasta` (requeridos), `page`, `size` (default 0/20), `idCliente`, `idVendedor`, `estado` (opcionales).
- `VentaRepository` no tiene ningún método paginado hoy — agregar uno nuevo tipo:
  ```java
  @Query("""
      SELECT v FROM Venta v
      WHERE v.fecha BETWEEN :desde AND :hasta
        AND (:idCliente  IS NULL OR v.cliente.idCliente  = :idCliente)
        AND (:idVendedor IS NULL OR v.usuario.idUsuario   = :idVendedor)
        AND (:estado     IS NULL OR v.estado              = :estado)
      """)
  Page<Venta> buscarPaginado(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta,
      @Param("idCliente") Integer idCliente, @Param("idVendedor") Integer idVendedor,
      @Param("estado") String estado, Pageable pageable);
  ```
- Si `rol == "VENDEDOR"`, el controller ignora `idVendedor` recibido y fuerza `idVendedor = idUsuario` antes de llamar al repo.
- `totales`: nueva query de agregación (`SUM(v.total)`, `SUM(v.igv)`, `SUM(v.descuentoGlobal)`) con el mismo filtro, sin `Pageable`.
- Medio de pago "Mixto" y ocultar `costoHistorico`/CPP a rol VENDEDOR: se resuelve en el frontend (el backend siempre manda el dato completo, igual que hoy pasa con `DashVendedor` ocultando costos que sí vienen en la respuesta de `/dashboard/stats`).
- Reusar el patrón de fila expandible ya implementado en `FRONTEND/src/pages/RegistroVentas.jsx` (estado `expandida`/`toggleExpandir`, líneas ~23–247): mismo mecanismo, ahora dentro de `TablaReporte.jsx`.

**Tab 2 — Compras** · `GET /api/reportes/compras`
- Params: `desde`, `hasta`, `page`, `size`, `idProveedor`, `estado` (opcionales).
- `CompraRepository` solo tiene `findAllByOrderByFechaDesc()`/`findByEstadoOrderByFechaDesc(String)` — agregar variante paginada con filtros opcionales, mismo patrón que Tab 1. `compra.detalles` ya es `@OneToMany EAGER` (confirmar en `Compra.java`), no requiere `JOIN FETCH` adicional.

**Tab 3 — Ajustes de Compra** · `GET /api/reportes/ajustes-compra`
- Params: `desde`, `hasta`, `tipo` (opcional). Sin paginar (bajo volumen).
- `CompraAjusteRepository` solo tiene `findByCompraOriginal_IdCompraOrderByFechaDesc` y `findByProducto_IdProductoOrderByFechaDesc` — agregar `findByFechaBetweenAndTipo(...)` con `tipo` opcional vía JPQL (`(:tipo IS NULL OR a.tipo = :tipo)`).
- Convención de signo de `impacto_stock`: positivo = entra stock, negativo = sale stock (coherente con `signo` de `transaccion_financiera`); mostrar con ícono/color (verde/rojo) en vez de solo el número.

**Tab 4 — Movimientos de Tesorería** · `GET /api/reportes/movimientos`
- Params: `desde`, `hasta`, `page`, `size`, `tipoMov`, `idCuenta` (opcionales).
- `TransaccionFinancieraRepository` tiene `findByFechaBetweenOrderByFechaDesc` pero no paginado ni combinable con `tipoMov`/`idCuenta` — agregar variante paginada con filtros opcionales, mismo patrón.
- La "Referencia" (`id_venta`/`id_compra`) se resuelve en el frontend: al hacer click, cambiar el `tab` activo a `"ventas"`/`"compras"` y setear el filtro `idVenta`/`idCompra` correspondiente (no modal).

**Tab 5 — Cierres de Caja** · `GET /api/reportes/cierres`
- Params: `desde`, `hasta` (sobre `fecha_cierre`), `idCuenta` (opcional). Sin paginar.
- Reusar `CierreDiarioRepository.findByFechaCierreBetweenOrderByFechaCierreDesc(...)`; filtrar por `idCuenta` en el controller (bajo volumen: un cierre por cuenta por día) o agregar overload si se prefiere en el repo.

**Tab 6 — Inventario / Productos** · `GET /api/reportes/productos`
- Sin filtro de fecha. Params: `idCategoria`, `tipo`, `soloStockBajo` (opcionales).
- Reusar `ProductoRepository.findByTipo(...)` y `findStockBajo()` donde aplique; no existe filtro por categoría — agregar `findByCategoria_IdCategoria(Integer)`. Con ~400 productos, es válido traer todo y combinar filtros en el controller en vez de armar una query JPQL con todas las combinaciones.

**Tab 7 — Clientes** · `GET /api/reportes/clientes`
- Params: `desde`, `hasta` (aplican solo a las columnas agregadas). Sin paginar.
- `ClienteRepository` no tiene ninguna query de agregación — agregar en `ClienteRepository`:
  ```java
  @Query("""
      SELECT c, COUNT(v.idVenta), COALESCE(SUM(v.total),0), MAX(v.fecha)
      FROM Cliente c LEFT JOIN Venta v
        ON v.cliente = c AND v.fecha BETWEEN :desde AND :hasta AND v.estado = 'confirmado'
      GROUP BY c
      """)
  List<Object[]> resumenPorCliente(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);
  ```
  El `LEFT JOIN ... ON` (no `WHERE`) es importante: así no se descartan clientes sin compras en el rango. El controller mapea `Object[]` a un DTO simple (record o `Map`).

**Tab 8 — Proveedores** · `GET /api/reportes/proveedores`
- Mismo patrón que Tab 7 pero con `Compra` en vez de `Venta`. Agregar query equivalente en `ProveedorRepository`.

**Tab 9 — Cuentas Financieras** · `GET /api/reportes/cuentas`
- Sin filtro de fecha, sin paginar. Reusar `CuentaFinancieraRepository.findByActivaTrue()` tal cual (o `findAll()` si se quiere ver inactivas con un toggle) — no requiere cambios en el repo.

**Tab 10 — Usuarios** · `GET /api/reportes/usuarios`
- Params: `desde`, `hasta` (para las columnas agregadas). Sin paginar.
- Mismo patrón de agregación que Tab 7/8 pero `Usuario` + `Venta`. Agregar query equivalente en `UsuarioRepository`.

**Tab 11 — Log de Eventos** · `GET /api/reportes/eventos`
- Params: `desde`, `hasta` (opcionales — si no vienen, usar `findTop100ByOrderByFechaDesc()` como hoy), `tipoEvento`, `entidad` (opcionales).
- `EventoLogRepository` ya tiene `findByTipoEventoOrderByFechaDesc` y `findByEntidadAndIdEntidadOrderByFechaDesc` por separado — agregar una variante combinada con rango de fecha + `tipoEvento` opcional (mismo patrón `(:param IS NULL OR ...)`) para no tener que encadenar filtros en memoria.

### Frontend — estructura de `Reportes.jsx`

- Reusar el patrón de tab-switcher de `FRONTEND/src/pages/Tesoreria.jsx` (`useState("ventas")` + array `[{k, label, disabled}]`, líneas ~48 y ~230–250): `disabled: true` en todas las tabs salvo `"ventas"` cuando `usuario.rol !== "ADMIN"`.
- Reusar el patrón de botones de período rápido de `FRONTEND/src/pages/Dashboard.jsx` (`DashVendedor`, líneas ~514–520: array `{k,l}` + botones) para hoy/semana/mes/año, sumando dos `<input type="date">` para rango libre — van dentro de `FiltroFecha.jsx`.
- `TablaReporte.jsx` recibe `columnas`, `data`, `totales`, `onSort`, `sortBy`/`sortDir`, `pagina`/`totalPaginas`/`onCambiarPagina` (estos tres últimos `null` en tabs sin paginar) y opcionalmente `renderExpandible` (usado solo en Tab 1, con el mismo mecanismo de `RegistroVentas.jsx`).
- `ExportButtons.jsx`: tres funciones puras — `exportarExcel` (usa `xlsx`), `exportarCSV` (arma el string a mano, sin librería), `exportarPDF` (reusa `jsPDF`, ya usado para el comprobante de venta en `FormVenta.jsx`/`ventas.jsx`). "HTML" no exporta archivo: dispara `window.print()` con un bloque `<style media="print">` que oculta todo menos la tabla del tab activo.
- Todas las exportaciones operan sobre `data` de la página/tab actualmente cargada en memoria, no sobre todo el rango de fechas sin paginar.

### Verificación

- Backend: `./mvnw spring-boot:run` desde `BACKEND/`. Probar cada endpoint nuevo con curl/Postman, con y sin filtros opcionales. Para Tab 1: confirmar que pasando `idUsuario` de un VENDEDOR + `idVendedor` de otro usuario en la query, el backend ignora ese `idVendedor` y devuelve solo las ventas del usuario logueado.
- Frontend: `npm run dev` desde `FRONTEND/`. Con dos usuarios de prueba (uno ADMIN, uno VENDEDOR):
  - VENDEDOR: solo ve Tab 1 habilitado, filtrado a sus propias ventas, sin columna de costo/CPP en el detalle expandible.
  - ADMIN: ve los 11 tabs, con paginación funcionando en Ventas/Compras/Movimientos, ordenamiento por columna, fila de totales correcta (verificar contra una suma manual de un rango chico), y las 4 exportaciones (Excel/CSV/PDF/HTML) generando salidas válidas con los datos visibles.

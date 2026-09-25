> **Qué es:** auditoría estática histórica del CPP que originó buena parte del backlog técnico. **No debe interpretarse como fotografía del código actual**, porque varios hallazgos ya fueron decididos o corregidos posteriormente.

# Revisión del CPP — 2026-09-05

Revisión estática del código local del backend Spring y frontend React. CPP significa costo promedio ponderado. No se ejecutaron peticiones contra una base de datos ni se modificó lógica de negocio. Se respetó el cambio previo en FRONTEND/src/pages/Productos.jsx. El inventario al final incluye todos los métodos HTTP declarados en los controladores; la evaluación se concentra en su relación con el CPP.

## Resultado

El flujo básico existe: compras recalculan producto.cpp; ventas normales congelan ese valor en costoHistorico; el dashboard suma costoHistorico × cantidad; Tesorería valora el inventario con stock × cpp. No hay consistencia completa entre compras, correcciones, anulaciones, servicios y edición manual.

## Hallazgos prioritarios

1. **Alta — descuentos de compra inconsistentes.** compras_final.jsx:212 y 680 descuentan descuentoPct en la vista, pero el payload (263–273) envía costoUnitario sin descontar. CompraController:76 calcula cantidad × costoUnitario y solamente guarda descuentoPct (174). El total, CPP y pago resultan mayores que lo mostrado. Ejemplo: 10 unidades a S/10 con 20%: vista S/80; backend S/100 y CPP S/10 si no había stock. El descuento global sí reduce el pago, pero no se distribuye al costo del inventario; requiere definir y aplicar una política explícita.

2. **Alta — compras borran deuda de inventario.** CompraController:127–132 y 178–186 reemplaza el stock cuando es <= 0. Stock -5 más compra de 10 termina en 10, no 5. Ocurre también con regalos de otro producto. La política de costo con stock negativo puede ser especial, pero la cantidad debe conservar la suma de movimientos.

3. **Alta — fórmula de ajuste puede inflar CPP.** CompraController:329–338 usa la cantidad original completa, aunque el stock actual sea menor. Stock actual 2, cantidad original 10 y costo nuevo S/6 produce CPP S/30. Incluso si queda suficiente stock, sustituye usando el CPP vigente, no el costo original del detalle. Frontend envía cantidadOriginal desde el primer detalle coincidente (compras_final.jsx:324–334), lo cual tampoco distingue líneas repetidas. Definir si se corrige el valor remanente, el lote o se hace una revalorización explícita.

4. **Alta — ajustes sin integridad suficiente.** POST /compras/{id}/ajuste carece de transacción conjunta para producto, ajuste y log; no comprueba que el producto pertenezca a la compra, que esté confirmada, ni tipo/costo/cantidad válidos. CANTIDAD y DEVOLUCION cambian stock conservando CPP y no revierten pagos. Pueden existir cambios de producto sin nota persistida si falla el guardado posterior.

5. **Alta — anulación de compra no garantiza reversión histórica.** CompraController:267–283 resta el valor original al inventario actual, trunca valores negativos y fuerza stock >= 0. Tras ventas o ajustes puede producir CPP cero o borrar faltantes. Ejemplo: 10 unidades a S/10, compra 10 a S/20, venta 10: quedan 10 a CPP15; anular la primera compra deja 0 y devuelve el CPP anterior, sin resolver el efecto sobre lo vendido. El frontend promete que el CPP vuelve al valor anterior (1179), algo que no sucede en todos los casos.

6. **Alta — escritura concurrente sin protección del producto.** Producto no tiene @Version y ProductoRepository no bloquea las lecturas usadas por compras, ventas o ajustes. Dos operaciones pueden leer el mismo stock/CPP y sobrescribir resultados. Además, editar un producto desde Compras reenvía stock y CPP capturados al abrir el modal (167–193), pudiendo deshacer operaciones ocurridas mientras está abierto.

7. **Alta — rechazo de venta puede dejar stock modificado.** VentaController:98–103 guarda stock dentro del bucle antes de validar todos los ítems, servicios y pago (164). Los retornos HTTP 400 posteriores no marcan rollback. Una venta rechazada por pago insuficiente puede consumir inventario sin registrar costo histórico, afectando el siguiente promedio de compra. Validar todo antes de mutar o garantizar rollback de los rechazos.

8. **Alta — costos de servicios omitidos del dashboard.** ventas.jsx:406–408 envía costos de servicios y porcentajes de impresiones. VentaController:175 los persiste en VentaDetalleServicio.costo, pero DashboardController:57 solo suma VentaDetalle.costoHistorico × cantidad. Los servicios aumentan ingresos sin que esos costos entren en totalCostos. Además, con idUsuario los ingresos se filtran pero los costos siguen siendo globales.

9. **Alta — permisos de costo no centralizados.** SecurityConfig:102–103 deja productos y compras disponibles para cualquier autenticado. Un vendedor puede invocar altas, edición de CPP, ajustes y anulaciones de compra. Las entidades completas en respuestas también exponen CPP/costoHistorico aunque la UI oculte columnas. Si el costo debe ser exclusivo del administrador, hace falta aplicar roles y DTOs en backend.

10. **Media — costo inventado y validación desigual.** ProductoController:74 asigna S/0.10 a CPP cero/null en altas para todos los tipos; PUT conserva el previo o asigna ese mínimo (132–136). No permite establecer cero intencional en servicios mediante edición, aunque su validación admite cero. No sanea los registros existentes al leer/vender; VentaController:119 todavía permite costo histórico cero. FormProducto permite CPP vacío y lo convierte en cero.

11. **Media — regalos pueden crear valor sin respaldo.** CompraController:116–119 trunca el costo del producto principal a cero si el valor asignado al regalo supera el lote, pero conserva todo el valor del regalo. Un lote de S/10 con regalo valorado en S/20 incorpora S/20. Un regalo sin CPP ni costo explícito se acepta con cero pese al aviso del frontend. El subtotal del detalle principal conserva el total previo a distribución y el regalo añade otro subtotal: la suma de detalles puede no coincidir con la cabecera.

12. **Media — validaciones de compra insuficientes.** CompraRequest no impone restricciones y crear no verifica cantidades/costos positivos, lista no vacía, cantidades enteras para UNIDAD o coherencia del producto bonificado. Productos inexistentes se omiten. Entradas directas pueden crear CPP negativo/cero o provocar división inválida; las validaciones de la pantalla no protegen la API.

13. **Media — dos campos de costo y mensajes contradictorios.** precioCosto sigue en entidad y datos iniciales pero el flujo usa cpp y no sincroniza precioCosto al comprar/editar. FormProducto permite editar CPP; Compras reenvía CPP, aunque anuncia que solo se actualiza al registrar compras (1413). Mensaje de ajuste también afirma CPP actualizado para CANTIDAD/DEVOLUCION, que lo conservan.

14. **Media — precisión visual insuficiente.** CPP se almacena con cuatro decimales, pero FormProducto:227 usa step=0.01 y múltiples vistas redondean a dos. Costos como 0.0250 quedan difíciles de inspeccionar/editar con precisión. Productos.jsx marca <= S/0.30 como CPP bajo: es una heurística, no una prueba de costo incorrecto; hay productos baratos legítimos en data.sql.

15. **Media — devoluciones de venta sin revalorización.** PATCH /ventas/{id}/anular reincorpora cantidad al CPP actual sin ponderar costoHistorico. Si el CPP cambió desde la venta, la cantidad devuelta se valora distinto al costo que se dio de baja. Requiere definir la política de devolución.

16. **Media — setup y reset incompletos respecto al costo.** SetupRequest declara stocks/costoPromedio pero configurar no los procesa. Reset pone stock a cero y conserva CPP y compras. El nuevo ciclo puede seguir ajustando/anulando compras previas que ya no corresponden al stock reiniciado.

## Cobertura del frontend y comportamiento por familia

| Familia de endpoints | Pantalla/consumidor | Relación con CPP |
|---|---|---|
| GET /productos, /buscar, /{id}, /pos, /consumibles, /stock-bajo, /stock-negativo | Productos, ventas, Compras, Tesorería, filtros | Devuelven CPP vigente sin saneamiento. POS activo usa /productos. No se identificó consumo directo de /pos, /consumibles o /stock-negativo. |
| POST /productos; PUT /productos/{id} | FormProducto y Compras | Inicialización/edición directa de CPP y stock; sin historial específico de revalorización. |
| PATCH /productos/{id}/ajuste-stock | Productos | Cambia cantidad, conserva CPP; no recibe costo de entrada. |
| PATCH imagen; DELETE producto | Productos/FormProducto | Sin recálculo de CPP. |
| GET /compras, /{id}, /{id}/ajustes | Compras | Lee costo por detalle, CPP anterior y notas; CPP anidado del producto es vigente, no snapshot de la compra. |
| POST /compras | Compras | Promedio ponderado y bonificaciones; incidencias 1, 2, 6, 11, 12. |
| PATCH /compras/{id}/anular | Compras | Retira cantidad/valor con límites a cero. |
| POST /compras/{id}/ajuste | Compras | COSTO cambia CPP; CANTIDAD/DEVOLUCION conservan CPP. |
| POST /ventas | ventas.jsx | Congela CPP backend en venta normal. Servicios aceptan costo enviado por frontend. |
| GET /ventas, /todas, /por-usuario/{idUsuario} | Dashboard, RegistroVentas | Lee costos históricos; el producto anidado conserva sus valores actuales. |
| GET/POST /ventas/{id}/detalle-servicio | Sin consumo directo identificado en frontend activo | POST permite agregar costo libre sin recalcular cabecera; GET devuelve detalles. |
| PATCH /ventas/{id}/anular | RegistroVentas | Devuelve stock, conserva CPP vigente. |
| GET /dashboard/stats | Dashboard, Tesorería | Agrega costo histórico normal; omite costo de servicios y no filtra costos por usuario. |
| GET /dashboard/resumen-tesoreria | Dashboard | Saldos/percepción; no recalcula CPP. |
| GET /reportes/ventas, /compras, /ajustes-compra, /productos | Reportes | Expone registros históricos y CPP vigente según el reporte; no corrige costos. |
| Otros GET /reportes/* | Reportes y HeatmapCard | Agregación de ventas/movimientos/entidades; sin escritura CPP. |
| /tesoreria/* y /tesoreria/cierre/* | Tesorería, ventas, Compras | Movimientos y cierres de caja no recalculan CPP. Inventario en frontend se calcula con productos: stock × cpp. |
| /setup/* | SetupWizard, AdminSistema | Configuración ignora costo inicial declarado; reset conserva CPP. |
| /auth/*, /usuarios/*, /clientes/*, /proveedores/*, /categorias/*, /eventos/*, /uploads/* | Autenticación y pantallas de mantenimiento | Sin cálculo/escritura directa de CPP en sus handlers. |

## Lo que funciona en el caso básico

- Compra con stock positivo, sin descuentos ni casos especiales: (stock × CPP anterior + costo de entrada) / stock nuevo, con BigDecimal y escala 4.
- Bonificación del mismo producto diluye el costo del lote entre las unidades recibidas.
- Venta normal toma el CPP del backend y lo guarda como costoHistorico; posteriores ediciones no reescriben ese campo histórico.
- Dashboard excluye ventas anuladas de su consulta de costos normales.
- Tesorería usa cpp, no precioCosto, para valorar el inventario mostrado.

## Validación y próximos pasos

La única prueba backend encontrada es contextLoads; no hay pruebas específicas de CPP en src/test. Esta revisión no demuestra el estado de los datos de producción ni reproduce concurrencia mediante HTTP. Los ejemplos numéricos son deducciones de las fórmulas presentes.

Priorizar descuentos, stock negativo, ajustes, atomicidad de venta y concurrencia. Después cerrar permisos, unificar reglas de servicios/devoluciones/revalorización y alinear mensajes/precisión. Validar con casos de stock positivo/cero/negativo, descuentos, regalos, venta intermedia, anulación, ajustes repetidos, errores tardíos de venta y dos operaciones simultáneas. No corregir automáticamente costos históricos antes de identificar qué registros fueron afectados.

## Inventario completo de endpoints declarados

Las rutas siguientes se extraen de las anotaciones de los controladores locales. Todas están cubiertas por las familias anteriores; presencia en este inventario no implica prueba HTTP ejecutada.

| Método | Ruta | Fuente |
|---|---|---|
| GET | `/api/auth/estado` | AuthController.java:40 |
| GET | `/api/auth/cuentas-setup` | AuthController.java:55 |
| POST | `/api/auth/primer-admin` | AuthController.java:61 |
| POST | `/api/auth/login` | AuthController.java:83 |
| POST | `/api/auth/recuperar/verificar` | AuthController.java:120 |
| POST | `/api/auth/recuperar/cambiar` | AuthController.java:145 |
| GET | `/api/categorias` | CategoriaController.java:17 |
| GET | `/api/categorias/{id}` | CategoriaController.java:22 |
| POST | `/api/categorias` | CategoriaController.java:29 |
| PUT | `/api/categorias/{id}` | CategoriaController.java:40 |
| DELETE | `/api/categorias/{id}` | CategoriaController.java:54 |
| GET | `/api/tesoreria/cierre/preview` | CierreController.java:26 |
| POST | `/api/tesoreria/cierre/ejecutar` | CierreController.java:33 |
| GET | `/api/tesoreria/cierre/historial` | CierreController.java:54 |
| GET | `/api/clientes` | ClienteController.java:17 |
| GET | `/api/clientes/buscar` | ClienteController.java:22 |
| POST | `/api/clientes` | ClienteController.java:27 |
| PUT | `/api/clientes/{id}` | ClienteController.java:32 |
| DELETE | `/api/clientes/{id}` | ClienteController.java:44 |
| GET | `/api/compras` | CompraController.java:32 |
| GET | `/api/compras/{id}` | CompraController.java:37 |
| POST | `/api/compras` | CompraController.java:45 |
| PATCH | `/api/compras/{id}/anular` | CompraController.java:253 |
| POST | `/api/compras/{id}/ajuste` | CompraController.java:312 |
| GET | `/api/compras/{id}/ajustes` | CompraController.java:356 |
| GET | `/api/dashboard/stats` | DashboardController.java:29 |
| GET | `/api/dashboard/resumen-tesoreria` | DashboardController.java:106 |
| GET | `/api/eventos` | EventoLogController.java:28 |
| GET | `/api/eventos/todos` | EventoLogController.java:34 |
| POST | `/api/eventos/sistema-iniciado` | EventoLogController.java:41 |
| POST | `/api/uploads/imagen` | ImagenController.java:34 |
| POST | `/api/uploads/imagen-url` | ImagenController.java:48 |
| POST | `/api/uploads/reparar-imagenes` | ImagenController.java:75 |
| GET | `/api/uploads/imagen/{nombre}` | ImagenController.java:112 |
| GET | `/api/productos` | ProductoController.java:27 |
| GET | `/api/productos/buscar` | ProductoController.java:32 |
| GET | `/api/productos/pos` | ProductoController.java:38 |
| GET | `/api/productos/consumibles` | ProductoController.java:44 |
| GET | `/api/productos/stock-bajo` | ProductoController.java:49 |
| GET | `/api/productos/stock-negativo` | ProductoController.java:54 |
| GET | `/api/productos/{id}` | ProductoController.java:59 |
| POST | `/api/productos` | ProductoController.java:66 |
| PUT | `/api/productos/{id}` | ProductoController.java:106 |
| PATCH | `/api/productos/{id}/imagen` | ProductoController.java:172 |
| PATCH | `/api/productos/{id}/ajuste-stock` | ProductoController.java:181 |
| DELETE | `/api/productos/{id}` | ProductoController.java:211 |
| GET | `/api/proveedores` | ProveedorController.java:17 |
| GET | `/api/proveedores/buscar` | ProveedorController.java:22 |
| POST | `/api/proveedores` | ProveedorController.java:27 |
| PUT | `/api/proveedores/{id}` | ProveedorController.java:32 |
| DELETE | `/api/proveedores/{id}` | ProveedorController.java:47 |
| GET | `/api/reportes/ventas` | ReportesController.java:76 |
| GET | `/api/reportes/ventas/heatmap` | ReportesController.java:117 |
| GET | `/api/reportes/compras` | ReportesController.java:149 |
| GET | `/api/reportes/ajustes-compra` | ReportesController.java:179 |
| GET | `/api/reportes/movimientos` | ReportesController.java:196 |
| GET | `/api/reportes/cierres` | ReportesController.java:224 |
| GET | `/api/reportes/productos` | ReportesController.java:266 |
| GET | `/api/reportes/clientes` | ReportesController.java:299 |
| GET | `/api/reportes/proveedores` | ReportesController.java:331 |
| GET | `/api/reportes/cuentas` | ReportesController.java:365 |
| GET | `/api/reportes/usuarios` | ReportesController.java:375 |
| GET | `/api/reportes/eventos` | ReportesController.java:407 |
| GET | `/api/setup/estado` | SetupController.java:32 |
| POST | `/api/setup/configurar` | SetupController.java:42 |
| POST | `/api/setup/reset-operaciones` | SetupController.java:92 |
| GET | `/api/tesoreria/cuentas` | TesoreriaController.java:37 |
| GET | `/api/tesoreria/resumen` | TesoreriaController.java:44 |
| GET | `/api/tesoreria/movimientos` | TesoreriaController.java:88 |
| POST | `/api/tesoreria/gasto` | TesoreriaController.java:97 |
| POST | `/api/tesoreria/ingreso-capital` | TesoreriaController.java:154 |
| POST | `/api/tesoreria/retiro` | TesoreriaController.java:186 |
| POST | `/api/tesoreria/transferencia` | TesoreriaController.java:231 |
| GET | `/api/usuarios` | UsuarioController.java:33 |
| GET | `/api/usuarios/{id}` | UsuarioController.java:39 |
| POST | `/api/usuarios` | UsuarioController.java:48 |
| PUT | `/api/usuarios/{id}` | UsuarioController.java:76 |
| PATCH | `/api/usuarios/{id}/password` | UsuarioController.java:99 |
| PATCH | `/api/usuarios/{id}/reset-password` | UsuarioController.java:115 |
| PATCH | `/api/usuarios/{id}/estado` | UsuarioController.java:128 |
| GET | `/api/ventas` | VentaController.java:35 |
| GET | `/api/ventas/todas` | VentaController.java:41 |
| GET | `/api/ventas/por-usuario/{idUsuario}` | VentaController.java:48 |
| POST | `/api/ventas` | VentaController.java:57 |
| POST | `/api/ventas/{id}/detalle-servicio` | VentaController.java:218 |
| GET | `/api/ventas/{id}/detalle-servicio` | VentaController.java:233 |
| PATCH | `/api/ventas/{id}/anular` | VentaController.java:240 |

# CLAUDE.md

Este archivo da contexto a Claude Code (claude.ai/code) para trabajar en este repositorio.

## Descripción del proyecto

AdrithStore es un sistema de punto de venta (POS), inventario y tesorería para un negocio minorista en Ica, Perú. El código está escrito en español (entidades, variables, comentarios, textos de UI) — mantén ese idioma al agregar código nuevo. Stack: backend Spring Boot 3.5 / Java 21, frontend React 19 + Vite, base de datos PostgreSQL. Ver `DOCUMENTACION.md` para una descripción completa de cada módulo/página.

## Comandos

**Backend** (desde `BACKEND/`):
```
./mvnw spring-boot:run       # levanta la API en :8080 (mvnw.cmd en Windows)
./mvnw test                  # corre los tests
./mvnw test -Dtest=NombreClase # corre una sola clase de test
./mvnw clean package         # genera el jar
```

**Frontend** (desde `FRONTEND/`):
```
npm run dev       # servidor Vite en :5173, redirige /api -> http://localhost:8080
npm run build     # build de producción
npm run preview   # previsualiza el build de producción
```

No hay script de lint configurado en `package.json`. El backend tiene una sola clase de test de plantilla (`BackendApplicationTests`) — no hay suite de tests real; para verificar cambios hay que correr la app.

## Base de datos

- PostgreSQL, base de datos `AdrithStore`, conexión en `BACKEND/src/main/resources/application.properties` (credenciales locales de desarrollo, puerto 5432).
- `spring.jpa.hibernate.ddl-auto=update` — Hibernate agrega columnas nuevas automáticamente pero **nunca borra datos**. Los cambios de esquema son aditivos por diseño; no confíes en que Hibernate elimine columnas removidas.
- `BACKEND/src/main/resources/data.sql` es un script de seed (categorías + ~400 productos) que corre después de la sincronización de esquema de Hibernate (`spring.jpa.defer-datasource-initialization=true`), en cada arranque (`spring.sql.init.mode=always`) — usa inserts idempotentes/`IF NOT EXISTS`, así que es seguro dejarlo activo.
- `BACKEND/src/main/resources/schema.md` documenta las definiciones canónicas de las tablas (17 tablas) — trátalo como fuente de verdad de nombres/tipos de columna al escribir queries o migraciones, y actualízalo cuando cambie el esquema.

## Arquitectura

**No hay capa de servicio para la mayoría de dominios.** La lógica de negocio (validación, mutación de stock, cálculo de precios e IGV) vive directamente dentro de las clases `@RestController` en `controller/`, no en una capa de servicio. Los únicos servicios reales son `LogService` (escritura de auditoría) y `TesoreriaService` (transacciones de tesorería/libro mayor), a los que llaman los controladores. Al editar un controlador como `VentaController` o `CompraController`, espera encontrar toda la lógica del dominio ahí — no busques una clase de servicio oculta.

**Los DTOs de request suelen ser clases estáticas anidadas dentro del controlador** (ej. `VentaController.VentaRequest`), no el paquete `dto/` de nivel superior. `dto/VentaRequest.java` existe pero es código muerto — `VentaController` define y usa su propia clase interna `VentaRequest` (ningún import resuelve a la versión de dto). `dto/CompraRequest.java`, en cambio, sí es la que realmente importa y usa `CompraController`. Revisa los imports antes de asumir qué DTO usa un controlador.

**No hay Spring Security.** La autenticación es totalmente custom: `AuthController` valida usuario/contraseña (SHA-256 + salt de 16 bytes vía `PasswordUtil`) y el frontend guarda el objeto de usuario en `localStorage` (`adrith_usuario`). La validación de roles (`ADMIN` vs `VENDEDOR`) se hace solo en el cliente, en `PrivateRoute` de `App.jsx` y checks por página — los endpoints de la API no verifican el rol del llamante en el servidor. El CORS está completamente abierto (`allowedOriginPatterns("*")` en `config/AppConfig.java`).

**El tipo de producto determina el comportamiento en todo el sistema** (`enums/TipoProducto`): `BIEN_FISICO` (stock físico, costeo CPP), `SERVICIO_PURO` (servicio hecho al momento, sin stock, ej. fotocopias), `SERVICIO_COMIS` (servicio de intermediación financiera como cambio Plin/Yape — genera dos registros de `TransaccionFinanciera` por venta y guarda su costo dinámicamente por venta en vez de en el producto), `CONSUMIBLE` (insumo interno, oculto del POS). La lógica de venta en `VentaController` bifurca repetidamente sobre este string (el stock solo se toca para `BIEN_FISICO`/`CONSUMIBLE`); la misma distinción aparece en `Productos.jsx` y `ventas.jsx` del frontend.

**Cada venta y gasto escribe en el libro mayor de tesorería.** `VentaController.crear()` inserta una `TransaccionFinanciera` por cada método de pago vía `TesoreriaService.registrar()`, mapeando los strings de método de pago (`Plin`, `Yape`, `Tarjeta`, `Transferencia`, si no `Caja Fisica`) a filas de `CuentaFinanciera`. Los ítems `SERVICIO_COMIS` además llaman a `tesoreriaService.procesarCambioDigital()` para registrar la transacción de cambio digital-efectivo de dos lados. Las compras (`CompraController`) afectan el CPP del producto (costo promedio ponderado, recalculado en cada compra y revertido al anular) en vez de afectar tesorería directamente.

**El log de auditoría es best-effort.** `LogService.log()` silencia excepciones (solo imprime a stderr) para que un fallo de logging nunca bloquee la operación principal (venta, compra, ajuste de stock). Las constantes de tipo de evento viven como campos `public static final String` en `LogService` — agrega nuevas ahí en vez de usar strings sueltos.

**Ruteo del frontend** (`FRONTEND/src/App.jsx`): los guards de ruta derivan de `AuthContext` (`usuario`, `estado.configurado`, `estado.hayUsuarios`) para secuenciar los flujos de primer uso: sin usuarios → `/primer-admin`; hay usuarios pero no logueado → `/login`; logueado pero negocio sin configurar → `/setup`; si no, la app normal. Las rutas solo-admin (`/usuarios`, `/admin-sistema`, `/eventos`, `/tesoreria`) están envueltas en `<PrivateRoute soloAdmin>`. El Dashboard se renderiza sin el `Layout` compartido (es su propia vista de operaciones a pantalla completa); el resto de páginas internas se renderizan dentro de `Layout`.

**Cliente de API** (`FRONTEND/src/api/axiosConfig.js`): una única instancia de axios compartida, con base URL desde `VITE_API_URL` o `/api` (redirigida a `localhost:8080` en dev vía `vite.config.js`). Los módulos de API por dominio (`productosApi.js`, `ventasApi.js`, etc.) envuelven esta instancia — sigue ese patrón para dominios nuevos en vez de llamar a axios directamente desde componentes.

**El módulo de Reportes (`/reportes`) ya está construido.** `REPORTES_NIVEL2_TABS.md` (raíz) documenta el spec — backend centralizado en `ReportesController.java` (`/api/reportes/**`, un endpoint por tab) y frontend en `FRONTEND/src/pages/Reportes.jsx`. La página tiene dos niveles: **Ejecutivo** (placeholder, contenido por definir) y **Detallado**, que contiene los 11 tabs del spec (Ventas, Compras, Ajustes de Compra, Movimientos de Tesorería, Cierres, Inventario, Clientes, Proveedores, Cuentas, Usuarios, Log de Eventos) con filtro de fecha compartido, tabla ordenable/paginada (`TablaReporte.jsx`) y exportación Excel/CSV/PDF/Imprimir por tab (`ExportButtons.jsx`). Solo el tab Ventas es visible para rol VENDEDOR (filtrado a sus propias ventas server-side); el resto es solo-ADMIN. `SCHEMA_COMPLETO.md` sigue siendo el doc de referencia del esquema de base de datos. `NewFeature.md` lista tareas pendientes específicas de backend/frontend (anulación de gastos, registro de ingreso manual) con la forma exacta de los endpoints.

**El PDF de comprobante individual (boleta/ticket 80mm) es un generador único y compartido**, en `FRONTEND/src/utils/comprobantePdf.js` (`imprimirComprobanteVenta`/`imprimirComprobanteCompra`) — lo usan por igual el botón "Imprimir" del POS (`ventas.jsx`), el detalle expandible de `RegistroVentas.jsx`, el de `compras_final.jsx`, y las filas de Ventas/Compras dentro de Reportes → Detallado. El diseño (logo cursivo, nombre de cliente/proveedor, tabla de ítems, totales) sigue la referencia `Boleta Bodega.html` de la raíz, con la tipografía Google Font "Playball" incrustada como base64 en `FRONTEND/src/utils/fonts/playballBase64.js` (necesaria porque `jsPDF` solo trae Helvetica/Times/Courier nativas). El alto de página se calcula en dos pasadas — una de medición sobre una hoja larga descartable y otra real ya con el alto exacto — para que el PDF no le sobre papel en blanco; los espacios entre líneas usan `doc.getTextDimensions()` (métrica real de cada fuente) en vez de constantes a mano, porque Playball necesita bastante más aire que Times al mismo tamaño.

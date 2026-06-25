# AdrithStore — Sistema POS, Inventario y Tesorería

## 📋 Descripción General

Sistema de punto de venta (POS) integral para negocio minorista en Ica, Perú. Desarrollado con **Spring Boot 3 + React 19 + PostgreSQL**. Cubre ventas, inventario, tesorería, compras y reportes.

---

## 🧱 Stack Tecnológico

| Capa       | Tecnología                | Versión  |
|------------|---------------------------|----------|
| Backend    | Java (Spring Boot)        | 3.5.14   |
| Backend    | JDK                       | 21       |
| DB         | PostgreSQL                | vía JPA  |
| Frontend   | React                     | 19.2.6   |
| Frontend   | Vite                      | 5.4.19   |
| Frontend   | Tailwind CSS              | 3.4      |
| Frontend   | Bootstrap                 | 5.3      |
| Gráficos   | Recharts                  | -        |
| PDF        | jsPDF                     | -        |
| Auth       | SHA-256 + salt (custom)   | -        |

---

## 🧩 Módulos del Sistema

### 1. 🛒 POS (Punto de Venta) — `/ventas`

Interfaz de dos paneles:

**Panel izquierdo — Catálogo:**
- Selector de cliente con búsqueda por nombre/DNI
- Tipo de comprobante: Boleta / Factura / Ticket
- Barra de búsqueda en tiempo real por nombre o SKU
- Filtro por categorías (píldoras horizontales)
- Grid de productos con:
  - Imagen o placeholder por categoría
  - Nombre, SKU, precio (S/), stock disponible
  - Badge de servicio (SERVICIO_PURO / SERVICIO_COMIS)
  - Indicador de agotado (rojo) / stock bajo (amarillo)
  - Contador de ítems ya agregados al carrito
  - Productos sin stock aparecen deshabilitados

**Panel derecho — Carrito (320px):**
- Contador de ítems + botón "Limpiar"
- Área de mensajes (error/advertencia/éxito)
- Items del carrito con:
  - Nombre + SKU
  - Controles de cantidad (−/+/input directo)
  - Precio unitario y subtotal por línea
  - Descuento por ítem (en S/)
  - Botón quitar
- **Totales:**
  - Subtotal, IGV (18%)
  - Descuento global / redondeo (se ingresa monto final, el sistema calcula la diferencia)
  - **TOTAL** final
- **Pago dividido** (split payment):
  - Hasta 3 líneas de pago
  - Métodos: Efectivo / Plin / Yape / Tarjeta / Transferencia
  - Auto-cálculo de faltante al enfocar campo
  - Validación de balance en tiempo real
  - Cálculo de vuelto
- **Botones de acción:**
  - "Confirmar Venta" (verde, deshabilitado si carrito vacío)
  - "Cancelar"
  - "Imprimir" (genera PDF con jsPDF en formato 80mm)

### 2. 📊 Dashboard — `/dashboard`

KPIs con selector de período (hoy / semana / mes / mes anterior / año):
- Total de ventas (cantidad)
- Ingresos totales (S/)
- Costos totales (S/)
- Gastos totales (S/)
- Margen (%)
- Utilidad (%)
- Ticket promedio (S/)
- Productos con stock bajo
- **Gráfico:** ÁreaChart (Recharts) de ventas agrupadas por unidad de tiempo
- **Acceso rápido:** Cuadrícula de botones a todos los módulos

### 3. 📦 Productos — `/productos`

CRUD completo con:
- Nombre, SKU (único), categoría, tipo de producto
- Precio de costo, precio de venta
- Stock, alerta de stock mínimo, stock negativo permitido
- Imagen del producto (subida o URL)
- **Tipos de producto:**
  | Tipo | Descripción | Stock | POS |
  |------|-------------|-------|-----|
  | BIEN_FISICO | Producto físico | Sí | Sí |
  | SERVICIO_PURO | Servicio (fotocopia, impresión) | No | Sí |
  | SERVICIO_COMIS | Servicio con comisión (Plin/Yape) | No | Sí |
  | CONSUMIBLE | Consumible interno | Sí | No |
- Ajuste de stock manual (delta + motivo)
- Precios por unidad (unidad, docena, caja) con factor de conversión

### 4. 🏷️ Categorías — `/categorias`

CRUD de categorías con nombre y descripción.

### 5. 👥 Clientes — `/clientes`

CRUD con:
- Nombre, apellido, DNI, teléfono
- Búsqueda por nombre, apellido o DNI

### 6. 📥 Compras — `/compras`

Registro de órdenes de compra con lógica avanzada:

**Bonificaciones:**
- **Mismo producto:** "Compra 12, recibe 2 gratis" — costo total distribuido entre todas las unidades
- **Producto diferente:** Costo asignado del producto pagado al producto bonificado

**Cálculo CPP (Costo Promedio Ponderado):**
```
nuevoCPP = (cppAnterior × stockActual + costoReal × cantidadNueva) / nuevoStock
```

- Tipo comprobante, serie, fecha
- Percepción, descuento global
- Detalle con vencimiento por ítem
- Anulación de compra (revierte CPP)
- Ajustes post-compra: COSTO / CANTIDAD / DEVOLUCIÓN
- Historial de ajustes por compra

### 7. 🏭 Proveedores — `/proveedores`

CRUD con:
- Empresa (único), RUC, teléfono, contacto, email
- Percepción (porcentaje)
- Búsqueda por cualquier campo

### 8. 💰 Tesorería — `/tesoreria` (solo ADMIN)

**Cuentas Financieras:**
| Tipo | Ejemplos |
|------|----------|
| EFECTIVO | Caja Física |
| DIGITAL | Plin, Yape |
| BANCO | Transferencia, Tarjeta |

**Características:**
- Cada venta registra automáticamente transacciones financieras (una por método de pago)
- Registro manual de gastos (con tipo, concepto, monto, cuenta)
- Resumen de período: saldos, ingresos, egresos
- **Cambio Digital:** Flujo Plin ↔ Efectivo
  1. Cliente envía (monto + comisión) al Plin
  2. Cajero entrega efectivo al cliente
  3. TX1: Plin INGRESO (monto + comisión)
  4. TX2: Caja Física EGRESO (monto)
- Gestión de períodos contables mensuales (apertura/cierre)
- Re cálculo de saldos

### 9. 👤 Usuarios — `/usuarios` (solo ADMIN)

CRUD con roles:
- **ADMIN:** Acceso total (usuarios, eventos, tesorería, configuración)
- **VENDEDOR:** POS, productos, clientes, compras, historial de ventas
- Activación/desactivación de usuarios
- Cambio de contraseña (propio o reseteo por admin)

### 10. 🔐 Autenticación

- Login con username + contraseña (hash SHA-256 + salt 16 bytes)
- Almacenamiento en localStorage como `adrith_usuario`
- Recuperación de contraseña en 2 pasos:
  1. Verificar identidad (username + DNI + teléfono)
  2. Establecer nueva contraseña
- Configuración inicial: creación del primer admin + setup del negocio

### 11. 📋 Registro de Ventas — `/registro-ventas`

Historial completo de ventas con:
- Búsqueda y filtros
- Detalle de cada venta (productos, pagos, descuentos)
- Modal de anulación con motivo obligatorio
- Re-impresión de comprobante

### 12. 📄 Event Log — `/eventos` (solo ADMIN)

Auditoría de todas las operaciones críticas:
- Tipo de evento, entidad afectada, descripción
- Datos en JSON del cambio realizado
- Últimos 100 eventos visibles

---

## 🔄 Flujo de Venta (Backend)

`POST /api/ventas`

1. **Validación:** Cliente, usuario, detalles y pagos obligatorios
2. **Descuento de stock:** Bienes físicos descuentan inventario; valida `permiteStockNegativo`
3. **Precio histórico:** Captura `precioVenta` y `cpp` del producto al momento de la venta
4. **Descuentos por ítem:** Descontados del subtotal de cada línea
5. **Descuento global:** Monto fijo sobre el total
6. **Cálculo IGV:** `subtotal = total / 1.18`, `igv = total - subtotal`
7. **Pagos múltiples:** Validación de suma de montos ≥ total
8. **Registro en tesorería:** Transacción por cada método de pago
9. **Auditoría:** Evento VENTA_CREADA

**Anulación:** `PATCH /api/ventas/{id}/anular` — Revierte stock, cambia estado a "anulado"

---

## 🗄️ Base de Datos — 17 Tablas

| Tabla | Propósito |
|-------|-----------|
| Categoria | Categorías de productos |
| Proveedor | Proveedores |
| Producto | Catálogo de productos |
| Producto_Unidad | Precios por unidad/medida |
| Cliente | Clientes |
| Compra | Órdenes de compra |
| Compra_Detalle | Items de compra |
| Compra_Ajuste | Ajustes post-compra |
| Venta | Ventas realizadas |
| Venta_Detalle | Items de venta |
| Venta_Pago | Pagos divididos por venta |
| Cuenta_Financiera | Cuentas de tesorería |
| Periodo_Contable | Períodos mensuales |
| Transaccion_Financiera | Libro mayor / movimientos |
| Evento_Log | Auditoría |
| Sistema_Config | Configuración del negocio |
| Usuario | Usuarios del sistema |

---

## 🌐 API — Endpoints Principales

### POS / Ventas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/ventas` | Listar ventas |
| POST | `/api/ventas` | Crear venta (checkout) |
| PATCH | `/api/ventas/{id}/anular` | Anular venta |

### Productos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/productos` | Todos los productos |
| GET | `/api/productos/pos` | Solo visibles en POS |
| GET | `/api/productos/buscar?nombre=` | Búsqueda por nombre/SKU |
| GET | `/api/productos/stock-bajo` | Stock bajo |
| POST | `/api/productos` | Crear producto |
| PUT | `/api/productos/{id}` | Actualizar producto |
| PATCH | `/api/productos/{id}/ajuste-stock` | Ajustar stock |

### Compras
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/compras` | Listar compras |
| POST | `/api/compras` | Crear compra (con bonificaciones) |
| PATCH | `/api/compras/{id}/anular` | Anular compra |
| POST | `/api/compras/{id}/ajuste` | Ajustar compra |

### Tesorería
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/tesoreria/cuentas` | Cuentas activas |
| GET | `/api/tesoreria/resumen` | Resumen del período |
| GET | `/api/tesoreria/movimientos?dias=` | Movimientos recientes |
| POST | `/api/tesoreria/gasto` | Registrar gasto manual |

### Dashboard
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | KPIs (periodo, usuario) |
| GET | `/api/dashboard/resumen-tesoreria` | Saldos de cuentas |

---

## 📄 Comprobante (PDF)

Generado con jsPDF en formato 80mm (thermal printer):
- Nombre del negocio: **ADRITHSTORE — Ica, Perú**
- Tipo y serie de comprobante
- Fecha y número de venta
- Lista de ítems: nombre, cantidad × precio = subtotal (− descuentos)
- Subtotal, IGV (18%), TOTAL
- Desglose de pagos
- Mensaje de agradecimiento

---

## 🧪 Seed Data

- **15 categorías** precargadas
- **401 productos** con nombres, precios, stocks y SKUs

---

## 📁 Estructura del Proyecto

```
AdrithStore/
├── BACKEND/
│   ├── src/main/java/com/AdrithStore/backend/
│   │   ├── controller/   (14 controladores REST)
│   │   ├── model/        (17 entidades JPA)
│   │   ├── repository/   (16 repositorios)
│   │   ├── service/      (LogService, TesoreriaService)
│   │   ├── dto/          (CompraRequest, VentaRequest)
│   │   ├── enums/        (TipoProducto)
│   │   └── util/         (PasswordUtil)
│   └── src/main/resources/
│       ├── application.properties
│       ├── schema.md
│       └── data.sql
└── FRONTEND/
    └── src/
        ├── api/           (7 módulos Axios)
        ├── auth/          (AuthContext, Login, Recuperar, setup)
        ├── components/    (common, forms, layout)
        ├── hooks/         (useDarkMode, useDebounce)
        └── pages/         (15 páginas: POS, Dashboard, etc.)
```

---

## ⚙️ Configuración

- Backend corre en `http://192.168.18.28:8080`
- Base de datos PostgreSQL configurada en `application.properties`
- CORS abierto a todos los orígenes
- Las imágenes subidas se redimensionan a 1280×720 JPEG


-- ── 1. CATEGORIAS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Categorias (
    id_Categoria  SERIAL PRIMARY KEY,
    Nombre        VARCHAR(120) UNIQUE NOT NULL,
    Descripcion   TEXT
);

-- ── 2. PROVEEDORES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Proveedores (
    id_Proveedor       SERIAL PRIMARY KEY,
    Empresa            VARCHAR(150) UNIQUE NOT NULL,
    Ruc                VARCHAR(11)  UNIQUE,
    Descripcion        TEXT,
    Emite_Percepcion   BOOLEAN DEFAULT FALSE,
    Telefono           VARCHAR(20),
    Contacto           VARCHAR(150),
    Email              VARCHAR(150)
);

-- ── 3. PRODUCTO ───────────────────────────────────────────────────────────
-- tipo_producto:
--   BIEN_FISICO    → stock, costo>0, inventario estricto
--   SERVICIO_PURO  → sin stock, costo calculado (fotocopias, tipeos)
--   SERVICIO_COMIS → sin stock, costo dinámico (cambio Plin/Yape)
--   CONSUMIBLE     → insumo interno, no visible en POS
CREATE TABLE IF NOT EXISTS Producto (
    id_Producto             SERIAL PRIMARY KEY,
    id_Categoria            INTEGER NOT NULL REFERENCES Categorias(id_Categoria),
    Sku                     VARCHAR(50)  UNIQUE,
    Nombre                  VARCHAR(250) NOT NULL,
    Descripcion             TEXT,
    Tipo                    VARCHAR(20)  NOT NULL DEFAULT 'BIEN_FISICO'
                            CHECK (Tipo IN ('BIEN_FISICO','SERVICIO_PURO','SERVICIO_COMIS','CONSUMIBLE')),
    Visible_En_Pos          BOOLEAN DEFAULT TRUE,  -- CONSUMIBLE lo tiene en FALSE
    Stock                   INTEGER DEFAULT 0,
    Precio_Costo            DECIMAL(10,4) DEFAULT 0,  -- costo estándar / CPP
    Precio_Venta            DECIMAL(10,2) DEFAULT 0,
    -- Para SERVICIO_COMIS: comisión base y cada cuánto (ej: 1.00 por cada 100)
    Comision_Base           DECIMAL(10,2),
    Comision_Cada           DECIMAL(10,2),
    Stock_Alert             INTEGER DEFAULT 5,
    Cpp                     DECIMAL(10,4) DEFAULT 0,
    Permite_Stock_Negativo  BOOLEAN DEFAULT TRUE,
    Imagen_Url              VARCHAR(500)
);

-- ── 4. PRODUCTO_UNIDAD ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Producto_Unidad (
    id_Unidad       SERIAL PRIMARY KEY,
    Id_Producto     INTEGER NOT NULL REFERENCES Producto(id_Producto) ON DELETE CASCADE,
    Nombre_Unidad   VARCHAR(80) NOT NULL,
    Unidad          INTEGER NOT NULL,
    Medida          VARCHAR(20),
    Precio_Venta    DECIMAL(10,2),
    CONSTRAINT uq_prod_unidad UNIQUE (Id_Producto, Nombre_Unidad)
);

-- ── 5. CLIENTE ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Cliente (
    id_Cliente  SERIAL PRIMARY KEY,
    Nombre      VARCHAR(100),
    Apellido    VARCHAR(100),
    DNI         VARCHAR(15),
    Telefono    VARCHAR(15)
);

-- ── 6. COMPRA ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Compra (
    id_Compra           SERIAL PRIMARY KEY,
    id_Proveedor        INTEGER NOT NULL REFERENCES Proveedores(id_Proveedor),
    Tipo_Comprobante    VARCHAR(20),
    Serie_Comprobante   VARCHAR(20),
    Fecha               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Estado              VARCHAR(20) DEFAULT 'confirmado',
    Motivo              TEXT,
    Subtotal            DECIMAL(10,2) DEFAULT 0,
    Descuento_Global    DECIMAL(10,2) DEFAULT 0,
    Percepcion          DECIMAL(10,2) DEFAULT 0,
    Total               DECIMAL(10,2) DEFAULT 0
);

-- ── 7. COMPRA_DETALLE ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Compra_Detalle (
    id_Compra_Detalle   SERIAL PRIMARY KEY,
    id_Compra           INTEGER NOT NULL REFERENCES Compra(id_Compra),
    id_Producto         INTEGER NOT NULL REFERENCES Producto(id_Producto),
    id_Unidad           INTEGER REFERENCES Producto_Unidad(id_Unidad),
    Cantidad            INTEGER NOT NULL DEFAULT 1,
    Costo_Unitario      DECIMAL(10,4) NOT NULL,
    Costo_Anterior      DECIMAL(10,4),
    Descuento_Pct       DECIMAL(5,2) DEFAULT 0,
    Subtotal            DECIMAL(10,2) NOT NULL,
    Vencimiento         DATE
);

-- ── 8. COMPRA_AJUSTE ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Compra_Ajuste (
    id_Ajuste           SERIAL PRIMARY KEY,
    id_Compra_Original  INTEGER NOT NULL REFERENCES Compra(id_Compra),
    id_Producto         INTEGER NOT NULL REFERENCES Producto(id_Producto),
    Fecha               TIMESTAMP DEFAULT NOW(),
    Tipo                VARCHAR(30) NOT NULL,
    Motivo              TEXT NOT NULL,
    Delta_Cantidad      INTEGER DEFAULT 0,
    Costo_Anterior      DECIMAL(10,4),
    Costo_Nuevo         DECIMAL(10,4),
    Cpp_Resultante      DECIMAL(10,4),
    Impacto_Stock       INTEGER DEFAULT 0
);

-- ── 9. VENTA ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Venta (
    id_Venta            SERIAL PRIMARY KEY,
    id_Cliente          INTEGER NOT NULL REFERENCES Cliente(id_Cliente),
    Tipo_Comprobante    VARCHAR(20),
    Serie_Comprobante   VARCHAR(4),
    Fecha               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Estado              VARCHAR(20) DEFAULT 'confirmado',
    Motivo              TEXT,
    Subtotal            DECIMAL(10,2),
    Igv                 DECIMAL(10,2),
    Total               DECIMAL(10,2)
);

-- ── 10. VENTA_DETALLE ─────────────────────────────────────────────────────
-- Monto_Operacion: para SERVICIO_COMIS = monto que transfirió el cliente
-- Comision_Cobrada: comisión real cobrada (puede diferir de precio_venta por descuento)
-- Descuento_Aplicado: monto descontado en S/
-- Pct_Descuento: porcentaje de descuento aplicado
CREATE TABLE IF NOT EXISTS Venta_Detalle (
    id_Venta_Detalle    SERIAL PRIMARY KEY,
    id_Venta            INTEGER NOT NULL REFERENCES Venta(id_Venta),
    id_Producto         INTEGER NOT NULL REFERENCES Producto(id_Producto),
    id_Unidad           INTEGER REFERENCES Producto_Unidad(id_Unidad),
    Cantidad            INTEGER NOT NULL,
    Precio_Historico    DECIMAL(10,2) NOT NULL,  -- precio sin descuento
    Costo_Historico     DECIMAL(10,4) NOT NULL,
    Descuento_Aplicado  DECIMAL(10,2) DEFAULT 0,
    Pct_Descuento       DECIMAL(5,2)  DEFAULT 0,
    Monto_Operacion     DECIMAL(10,2),            -- solo SERVICIO_COMIS
    Comision_Cobrada    DECIMAL(10,2),            -- solo SERVICIO_COMIS
    Subtotal            DECIMAL(10,2) NOT NULL    -- precio final con descuento
);

-- ── 11. VENTA_PAGO ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Venta_Pago (
    id_Pago     SERIAL PRIMARY KEY,
    id_Venta    INTEGER NOT NULL REFERENCES Venta(id_Venta) ON DELETE CASCADE,
    Medio_Pago  VARCHAR(50) NOT NULL,
    Monto       DECIMAL(10,2) NOT NULL
);

-- ── 12. CUENTA_FINANCIERA ─────────────────────────────────────────────────
-- Registro de cajas, billeteras digitales y cuentas bancarias
CREATE TABLE IF NOT EXISTS Cuenta_Financiera (
    id_Cuenta      SERIAL PRIMARY KEY,
    Nombre         VARCHAR(100) NOT NULL,
    Tipo           VARCHAR(20)  NOT NULL  -- EFECTIVO | DIGITAL | BANCO
                   CHECK (Tipo IN ('EFECTIVO','DIGITAL','BANCO')),
    Descripcion    TEXT,
    Saldo_Actual   DECIMAL(12,2) DEFAULT 0,  -- calculado por TesoreriaService.recalcular()
    Activa         BOOLEAN DEFAULT TRUE
);

-- ── 13. PERIODO_CONTABLE ──────────────────────────────────────────────────
-- Apertura mensual: establece el saldo inicial de cada cuenta para el mes
CREATE TABLE IF NOT EXISTS Periodo_Contable (
    id_Periodo     SERIAL PRIMARY KEY,
    Periodo        VARCHAR(7)   UNIQUE NOT NULL,  -- 'YYYY-MM'
    Fecha_Apertura TIMESTAMP DEFAULT NOW(),
    Estado         VARCHAR(20)  DEFAULT 'abierto'  -- abierto | cerrado
                   CHECK (Estado IN ('abierto','cerrado')),
    Notas          TEXT
);

-- ── 14. TRANSACCION_FINANCIERA ────────────────────────────────────────────
-- El libro mayor: cada movimiento de dinero en cualquier cuenta
-- tipo_mov:
--   APERTURA         → saldo inicial del período
--   VENTA            → cobro de venta (generado automáticamente)
--   COMPRA           → pago de compra de mercadería (generado al registrar compra)
--   GASTO            → gasto operativo (tóner, luz, agua) — sin boleta de compra
--   CAMBIO_DIGITAL   → flujo de cambio Plin/Yape (par de TX por transacción)
--   AJUSTE           → corrección manual por el administrador
--   TRANSFERENCIA    → movimiento entre cuentas propias
CREATE TABLE IF NOT EXISTS Transaccion_Financiera (
    id_Transaccion  SERIAL PRIMARY KEY,
    Fecha           TIMESTAMP DEFAULT NOW(),
    Tipo_Mov        VARCHAR(30) NOT NULL
                    CHECK (Tipo_Mov IN (
                        'APERTURA','VENTA','COMPRA','GASTO',
                        'CAMBIO_DIGITAL','AJUSTE','TRANSFERENCIA'
                    )),
    id_Cuenta       INTEGER NOT NULL REFERENCES Cuenta_Financiera(id_Cuenta),
    Monto           DECIMAL(10,2) NOT NULL CHECK (Monto >= 0),
    Signo           SMALLINT NOT NULL CHECK (Signo IN (1,-1)),
    -- Signo: +1 = entrada de dinero, -1 = salida de dinero
    Concepto        TEXT,
    id_Venta        INTEGER REFERENCES Venta(id_Venta),
    id_Compra       INTEGER REFERENCES Compra(id_Compra),
    Periodo         VARCHAR(7),  -- 'YYYY-MM' para filtro mensual
    Creada_Por      VARCHAR(50)
);

-- ── 15. EVENTO_LOG ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Evento_Log (
    id_Evento       SERIAL PRIMARY KEY,
    Fecha           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Tipo_Evento     VARCHAR(60) NOT NULL,
    Entidad         VARCHAR(30),
    Id_Entidad      INTEGER,
    Descripcion     TEXT,
    Datos_Json      TEXT
);

-- ── ÍNDICES ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_venta_fecha         ON Venta(Fecha);
CREATE INDEX IF NOT EXISTS idx_venta_estado        ON Venta(Estado);
CREATE INDEX IF NOT EXISTS idx_compra_fecha        ON Compra(Fecha);
CREATE INDEX IF NOT EXISTS idx_compra_estado       ON Compra(Estado);
CREATE INDEX IF NOT EXISTS idx_producto_sku        ON Producto(Sku);
CREATE INDEX IF NOT EXISTS idx_producto_tipo       ON Producto(Tipo);
CREATE INDEX IF NOT EXISTS idx_evento_fecha        ON Evento_Log(Fecha);
CREATE INDEX IF NOT EXISTS idx_vpago_venta         ON Venta_Pago(id_Venta);
CREATE INDEX IF NOT EXISTS idx_tx_cuenta_periodo   ON Transaccion_Financiera(id_Cuenta, Periodo);
CREATE INDEX IF NOT EXISTS idx_tx_fecha            ON Transaccion_Financiera(Fecha);
CREATE INDEX IF NOT EXISTS idx_tx_tipo             ON Transaccion_Financiera(Tipo_Mov);
CREATE INDEX IF NOT EXISTS idx_periodo_contable    ON Periodo_Contable(Periodo);
# AdrithStore — Arquitectura técnica

## Visión

Aplicación full-stack con separación entre presentación, API/reglas de negocio y persistencia.

```text
React/Vite
   ↓ HTTP/JSON
Spring Boot / Security / reglas de negocio
   ↓ JPA
PostgreSQL
```

## Responsabilidades

### Frontend
Interacción, validaciones de conveniencia, visualización, captura de datos y experiencia responsive. Puede previsualizar cálculos, pero no debe ser autoridad sobre costos, permisos, stock, CPP ni reglas financieras sensibles.

### Backend
Fuente de verdad para validaciones, autorización, costos históricos, inventario, transacciones y cálculos que afecten persistencia. Las operaciones relacionadas deben ser atómicas cuando corresponda.

### Base de datos
Persistencia de entidades operativas e históricos. Los snapshots históricos deben permitir explicar una operación sin depender de valores actuales del catálogo.

## Dominios funcionales

- Comercial: ventas, productos, servicios, clientes.
- Abastecimiento: compras y proveedores.
- Inventario: stock, CPP, costo histórico y futuras transformaciones.
- Financiero operativo: cuentas, tesorería, pagos y gastos.
- Analítica: dashboard, tendencias, heatmap y métricas.
- Administración: usuarios, roles, configuración y logs.

## Riesgos técnicos ya identificados

El backlog documenta trabajo pendiente sobre atomicidad (#5), concurrencia (#6), ajustes/anulaciones (#10/#11), permisos (#12), servicios/costos (#13), revalorización (#14), setup/inventario inicial (#16) y transformación (#19).

## Decisiones arquitectónicas vigentes

- Backend autoritativo.
- Costos históricos congelados por operación.
- CPP no editable como efecto lateral de formularios generales.
- Movimientos financieros no deben confundirse automáticamente con ingreso, costo o ganancia.
- Dashboard debe consumir semántica común y filtros coherentes.
- Cambios de reglas no deben reescribir históricos automáticamente.

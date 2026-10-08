# AdrithStore — Proyecto académico

**Sistema de gestión comercial e inventario para pequeños y medianos comercios.**

AdrithStore nació para cubrir la operación cotidiana de una bodega, pero su modelo busca soportar comercios con mayor volumen y responsabilidad operativa, como minimarkets, tiendas de ropa, calzado y negocios que combinan productos y servicios.

## Qué resuelve

Centraliza ventas/POS, compras, inventario valorizado, clientes, proveedores, servicios, tesorería y analítica operacional. El objetivo no es presentarlo como un ERP generalista: el POS es uno de sus módulos dentro de un sistema integrado de gestión comercial.

## Capacidades actuales

- POS y registro histórico de ventas.
- Productos físicos, consumibles y servicios.
- Compras, proveedores y percepción.
- Inventario con CPP/costo histórico.
- Múltiples medios de pago y tesorería.
- Clientes, usuarios, roles y trazabilidad.
- Dashboard, tendencias y mapa de calor.
- Operación responsive para escritorio y móvil.

## Arquitectura

- Frontend: React + Vite.
- Backend: Java + Spring Boot.
- Persistencia: PostgreSQL/JPA.
- Seguridad: Spring Security/JWT.
- Despliegue: Windows, servicio backend, reverse proxy/TLS.

Ver [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## Estado del proyecto

Este repositorio conserva la versión académica de AdrithStore para aprendizaje y portafolio. La evolución profesional continúa por separado bajo el nombre Adrith. Esta versión no debe considerarse una distribución lista para producción.

Las reglas aprobadas y las que aún están pendientes se consolidan en [docs/REGLAS_NEGOCIO.md](docs/REGLAS_NEGOCIO.md).

## Documentación

- [Entrega académica y ejecución local](docs/ENTREGA_ACADEMICA.md)
- [Producto y alcance](docs/PRODUCTO.md)
- [Arquitectura técnica](docs/ARQUITECTURA.md)
- [Reglas de negocio](docs/REGLAS_NEGOCIO.md)
- [Índice de documentación](docs/README.md)
- [Despliegue](docs/deployment/README-DEPLOY.md)
- [Auditoría histórica de CPP](docs/audits/REVISION_CPP.md)
- [Referencia histórica de esquema](docs/reference/schema.md)

## Nota de portafolio

El proyecto prioriza decisiones de ingeniería y reglas de negocio reales: costo promedio ponderado, costo histórico, consistencia transaccional, concurrencia, separación entre actividad comercial y movimientos financieros, permisos y trazabilidad. Los issues abiertos forman parte de la evolución documentada del sistema.

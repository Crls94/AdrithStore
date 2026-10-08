# AdrithStore — Entrega académica

## Propósito y estado

AdrithStore conserva una aplicación de gestión comercial como proyecto académico y de portafolio. La evolución profesional continúa por separado bajo el nombre Adrith. Esta entrega no constituye una certificación de seguridad ni una distribución validada para producción.

La separación académica retiró del seguimiento Git los archivos de preparación específica para Google Cloud y conservó el código, las pruebas, las migraciones y la documentación funcional. Pueden permanecer copias locales sin registrar; no forman parte de la entrega versionada. Adrith es el proyecto profesional privado separado; su contenido no se verificó para esta entrega.

## Alcance implementado

- Ventas/POS y registro de operaciones.
- Productos, categorías, compras, clientes y proveedores.
- Inventario y cálculos de costo promedio ponderado e histórico.
- Tesorería y medios de pago.
- Usuarios, autenticación JWT y permisos.
- Dashboard, reportes, trazabilidad y métricas de infraestructura para administradores.

La existencia de estos módulos no implica que todos sus casos límite estén resueltos. Los hallazgos documentados deben consultarse antes de reutilizar el proyecto.

## Arquitectura

Frontend React/Vite; backend Java 21 y Spring Boot; persistencia PostgreSQL mediante JPA; autenticación y autorización con Spring Security/JWT. Las migraciones utilizan Flyway y existen rutinas de inicialización adicionales.

Referencias: [arquitectura](ARQUITECTURA.md), [reglas de negocio](REGLAS_NEGOCIO.md), [producto](PRODUCTO.md) e [índice](README.md).

## Ejecución local

Requisitos: JDK 21, Node.js/npm compatibles con el frontend y PostgreSQL de prueba. Utilizar una base aislada: el perfil predeterminado es `dev`; al arrancar se ejecutan Flyway, la inicialización de `data.sql` y la rutina adicional `DbMigrationRunner`, que puede modificar restricciones del esquema.

Configurar en el entorno del proceso backend las variables `DB_URL`, `DB_USER`, `DB_PASSWORD` y `JWT_SECRET`. `DB_URL` debe ser una URL JDBC de PostgreSQL. Utilizar credenciales propias y una clave JWT aleatoria de al menos 32 bytes en UTF-8: `JwtUtil` usa esos bytes directamente para construir la clave HMAC, sin decodificar Base64. No publicar sus valores.

Spring Boot no carga automáticamente un archivo `.env` arbitrario. Las variables deben suministrarse mediante el entorno o un mecanismo de arranque explícito.

Backend, desde `BACKEND`:

```powershell
.\mvnw.cmd spring-boot:run
```

Frontend, desde `FRONTEND`:

```powershell
npm ci
npm run dev
```

Abrir `http://localhost:5173`. Vite reenvía `/api` a `http://localhost:8080`, el puerto predeterminado del backend; con las variables de API vacías se utilizan esas rutas relativas. Si se cambian los puertos u orígenes, revisar `FRONTEND/.env.example` y `vite.config.js` para la conexión a la API. Si la base no contiene usuarios, crear el primero desde `/primer-admin`; el backend rechaza esta operación cuando ya existe cualquier usuario. Ninguna variable del frontend debe contener secretos: su contenido puede ser visible en el navegador.

## Pruebas y evidencia

El repositorio contiene pruebas de backend para cálculos de compra, CPP, dashboard, validación e infraestructura; también pruebas de frontend y escenarios de integración/E2E.

Esta documentación no registra una nueva ejecución de pruebas. Una compilación correcta no sustituye las validaciones de integración, permisos, concurrencia y restauración. Las pruebas que requieren PostgreSQL deben utilizar un entorno de prueba y revisarse antes de ejecutarlas.

Consultar las auditorías conservadas y sus fechas; sus resultados corresponden a las versiones y condiciones allí indicadas.

## Datos y seguridad

`data.sql` contiene un catálogo real conservado por decisión del propietario: se identificaron 17 inserciones de categorías y 398 de productos. No debe confundirse con un catálogo ficticio ni con una copia completa de la base operativa.

La configuración actual de desarrollo exige las credenciales por variables de entorno. Esto no elimina valores incluidos en commits anteriores. Sigue pendiente auditar el historial público y reemplazar cualquier credencial real que haya quedado expuesta. No se deben cerrar esos pendientes como resueltos sin evidencia.

No se deben registrar archivos de credenciales locales, bases de datos, backups ni uploads privados.

## Limitaciones y cierre del backlog

La entrega no acredita soporte para múltiples clientes o sucursales ni un despliegue de producción en Cloud Run/Neon. Cualquier evolución profesional corresponde al proyecto privado Adrith, fuera del alcance de esta entrega.

Los issues deben conservarse como evidencia. Los resueltos se cierran con referencias a la implementación y validación. Las propuestas fuera del alcance académico pueden cerrarse como no planificadas, dejando explícito que no se implementaron. Los problemas de seguridad o defectos conocidos no se consideran solucionados por terminar la etapa académica.

La lista final de issues y motivos de cierre requiere revisar el estado vigente de GitHub; no se incluye una clasificación no verificada.

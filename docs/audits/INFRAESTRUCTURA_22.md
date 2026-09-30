# Issue #22 — observabilidad del servidor actual

## Auditoría previa (30/09/2026)

- Spring Boot 3.5.14, objetivo Java 21. Starters Web, JPA, Security y Test; PostgreSQL y Flyway. No existían Actuator ni un registro de métricas de aplicación. Se añadió únicamente `spring-boot-starter-actuator`, dejando las versiones a cargo de Boot. Dependencias resueltas: Micrometer 1.15.11, HikariCP 6.3.3, Spring Security 6.5.10 y PostgreSQL JDBC 42.7.10.
- Seguridad stateless con JWT propio. `JwtAuthFilter` valida el token sin acceder a BD y construye `ROLE_ADMIN` / `ROLE_VENDEDOR`. ADMINISTRADOR corresponde al valor existente `ADMIN`; no se añadió otro rol ni se cambió autenticación.
- PostgreSQL: perfiles dev/prod existentes; producción toma URL y credenciales del entorno. No se modificó ninguno de esos perfiles, el datasource, el driver ni la configuración del pool.
- No hay propiedades Hikari explícitas en el repositorio. HikariCP 6.3.3 usa por defecto máximo 10, mínimo igual al máximo, keepalive 120 s, maxLifetime 30 min, connectionTimeout 30 s, validationTimeout 5 s e idleTimeout 10 min. El idleTimeout no reduce un pool cuyo mínimo es igual al máximo. Son valores de la biblioteca, **no una inspección del entorno real de producción**; variables externas podrían sobrescribirlos.
- No se encontraron `@Scheduled`, `@EnableScheduling`, jobs, ejecutores periódicos ni polling backend explícito contra BD en `src/main`.
- Inicialización existente: Flyway, validación de esquema Hibernate, `spring.sql.init.mode=always` con seed idempotente `data.sql`, y `DbMigrationRunner` que inspecciona/elimina una constraint al arrancar. Pueden generar consultas/escrituras en cada arranque. Se conservaron sin cambios.
- Antes de esta implementación no había health checks Actuator. Los ejemplos Caddy/Nginx y scripts de despliegue revisados no configuran probes SQL periódicos. No se inspeccionaron servicios/monitores externos del servidor.
- Frontend React 19, React Router 7, Vite y Tailwind/Bootstrap. La navegación activa está en `Layout.jsx`; `App.jsx` ya aplica `PrivateRoute soloAdmin`. El reloj usa un intervalo local de 1 s sin red. Los demás timeouts encontrados son UI/debounce. `AuthContext` consulta estado al montar/iniciar sesión; páginas comerciales consultan al abrirse/cambiar filtros. No se encontró polling periódico de BD en frontend.
- Reutilización comercial: `VentaRepository.sumTotal` y `CompraRepository.sumTotal` ya calculan agregados filtrados por fechas y estado. Se reutilizan exclusivamente con `confirmado`; no se cargan entidades, detalles, pagos ni se recalculan importes. No se invoca el dashboard ni se altera su lógica.

## Arquitectura y acceso

`GET /api/infraestructura/metricas` → `MetricasInfraestructuraService` → lista de `ProveedorMetricas`:

- `MetricasNativas`: lecturas del `MeterRegistry` autoconfigurado por Boot (HTTP, JVM, proceso y Hikari).
- `MetricasActividad`: dos agregados comerciales **solo** si el administrador solicita `?incluirActividad=true`. Sin transacción envolvente en la carga técnica: no obtiene conexiones por leer métricas.
- Futuro proveedor Neon: implementar `ProveedorMetricas` como bean y devolver nuevas secciones; controlador y UI renderizan el mismo contrato.

DTO cerrado `MetricasSnapshot`: timestamp UTC ISO-8601, estado de disponibilidad general, secciones y métricas con id, nombre, valor, unidad, estado y detalle. Estados: `MEDIDO`, `ESTIMADO`, `NO_DISPONIBLE`. No se fabrican estimaciones en esta fase. Ausencia/NaN/valor negativo de un instrumento se representa como null/no disponible, no como cero.

La cadena Security existente exige ADMIN en `/api/infraestructura/**` y `/actuator/**`. Actuator tiene exposición HTTP y JMX excluida por completo; su health contributor de BD está deshabilitado para impedir checks SQL. No se serializan tags HTTP, URIs, datasource, configuración, objetos de Actuator, variables de entorno ni errores SQL. Las respuestas propias usan `Cache-Control: no-store`. Un ADMIN puede recibir 401 en vez de 404 al pedir una ruta Actuator inexistente debido al error dispatch de la seguridad existente; no se cambió ese comportamiento global.

Frontend `/infraestructura`: menú ADMIN, guardia ADMIN, carga inicial, botones de actualización técnica y de actualización con actividad comercial, captura JSON descargable, estados de disponibilidad y última captura. Sin intervalos, reintentos ni refresco al volver a la ventana. Botones bloqueados durante solicitudes, cancelación al desmontar. La sección Neon permanece pendiente.

## Métricas disponibles

| Grupo | Mediciones / alcance |
| --- | --- |
| HTTP | Requests completados, errores 4xx/5xx, latencia media ponderada y tiempo HTTP total, desde inicio de esta instancia. Fuente `http.server.requests`; incluye tráfico del monitor y rechazos Security. La solicitud actual cuenta al terminar. |
| JVM | Memoria usada y comprometida (suma heap/no heap), threads vivos, tiempo acumulado de pausas GC cuando hay instrumento/muestras. |
| Proceso | CPU proceso/sistema (ratio, presentado como %), uptime y comienzo del proceso. Disponibilidad dependiente de JVM/SO. |
| PostgreSQL | Hikari activas, libres, pendientes, máximo y mínimo. Estado del pool en memoria; no certifica salud/conectividad SQL de PostgreSQL. |
| Comercial | Total monetario de ventas y compras confirmadas del día calendario America/Lima (PEN). Dos SELECT agregados existentes, exclusivamente a demanda. Es contexto comercial, no unidades de cómputo. |
| General | Backend responde, estado de disponibilidad `DISPONIBLE`/`PARCIAL`, fecha de captura. `PARCIAL` también puede deberse a actividad comercial no solicitada; no equivale a una avería. |

## Métricas no disponibles / limitaciones

- Neon: CU-hours, almacenamiento, egress, facturación y límites. No hay conexión/proveedor Neon ni conversión de CPU local a CU-hours.
- Percentiles p95/p99: no se activaron histogramas adicionales. Se presenta solo latencia media acumulada.
- CPU/memoria propias del servidor PostgreSQL, tamaño de tablas/BD, consultas por segundo, disco/red de la máquina: no se dispone de esas fuentes en el registro nativo utilizado.
- Algunas métricas JVM/CPU/GC pueden ser no disponibles hasta que el instrumento reporte una muestra válida.
- Sin series históricas persistidas ni agregación entre instancias. Las métricas técnicas se pierden al reiniciar el proceso; las capturas no representan picos entre observaciones.

## Línea base durante varios días

1. Descargar capturas manualmente en horarios comparables (inicio/fin de jornada y períodos de mayor actividad); guardar el JSON fuera del servidor.
2. Comparar timestamp e inicio del proceso antes de calcular diferencias de requests/errores/tiempo HTTP. Si cambió el inicio, no restar contadores como si fueran la misma serie.
3. CPU/memoria/conexiones son lecturas puntuales; no interpretarlas como promedio de todo el intervalo. Latencia media es acumulada por instancia.
4. Cargar el contexto comercial solo cuando se necesite: cada actualización de ese tipo ejecuta dos agregados del día y puede despertar una futura BD Neon. La actualización técnica normal ejecuta cero consultas comerciales y cero adquisiciones de conexiones SQL (verificado en integración).

No hay escrituras ni tabla de métricas, tareas programadas ni persistencia periódica añadidas por este módulo. Actuator/Micrometer sí instrumenta el tráfico normal en memoria.

## Procesos que podrían impedir scale-to-zero / Fase Neon

- **Hikari**: mínimo igual al máximo, keepalive y renovación de conexiones pueden generar actividad sin usuarios. Para Neon TEST evaluar mínimo 0, keepalive deshabilitado/compatible, lifetime/idleTimeout y tamaño del pool, junto con conexión directa/pooler. No aplicar estos ajustes a producción en esta fase.
- **Arranques/reinicios**: Flyway, validación, seed y `DbMigrationRunner` despiertan la BD; revisar separar migraciones y seed de arranques normales y trasladar el runner a una migración controlada. No modificar agresivamente el comportamiento existente.
- **Probes/monitorización externos**: auditar configuración efectiva del servidor, NSSM/systemd, uptime monitors y proxy antes de Neon. No apuntar probes periódicos a endpoints comerciales ni al health SQL. Actuator DB health quedó deshabilitado.
- **Uso de la aplicación**: auth/estado al cargar y navegación/filtros generan lecturas; la consulta comercial opcional del monitor también. Ninguno debe convertirse en polling frecuente.
- **Historia**: decidir retención/almacenamiento externo y estrategia de capturas/exportación si se requiere una serie continua. No diseñar un recolector que consulte PostgreSQL periódicamente.
- **Escala**: métricas actuales son por instancia; decidir agregación y credenciales del futuro proveedor Neon exclusivamente en backend, preservando el DTO seguro y ADMIN.

## Validación y evidencia de alcance

- `mvn.cmd -B ... verify`: BUILD SUCCESS. **93 tests descubiertos, 70 ejecutados/pasados, 23 omitidos por sus guardas existentes** (14 integración issue7 y 9 integración issue18). Sin fallos/errores.
- La ejecución activó `InfraestructuraIssue22IntegrationTest` contra PostgreSQL desechable `127.0.0.1:55439/adrith_infra_issue22`; también redirigió `BackendApplicationTests` a esa BD. Nunca se ejecutaron tests con el datasource actual de negocio.
- Nuevas pruebas: media HTTP ponderada/4xx/5xx; falta de instrumentos y NaN; carga técnica sin repositorios; lectura opcional solo de agregados y sanitización de errores; HTTP real con JWT (401 anónimo, 403 VENDEDOR, 200 ADMIN); exposición Actuator vacía; métricas reales HTTP/JVM/Hikari/contexto comercial; captura técnica sin aumentar adquisiciones SQL Hikari.
- Pasaron las pruebas existentes de cálculo de compras, reposición CPP, producto CPP, validación payload y períodos dashboard (62 tests unitarios de negocio), más carga del contexto existente.
- Frontend `npm.cmd run build`: correcto. Advertencia de chunks >500 kB del bundle general existente.
- Frontend `node --test src/utils/compraPayload.test.js`: 4/4 correctos.
- Entorno de validación: JDK 26.0.2.1, compilación `release 21`, PostgreSQL 18.3 aislado. Warnings preexistentes: APIs deprecadas/Lombok/Mockito y Flyway recomendando soporte de PostgreSQL más reciente. No se cambiaron versiones ajenas al issue para resolverlos.
- No se ejecutó todavía una observación de varios días en el servidor real ni una prueba visual/E2E de la nueva vista. Eso requiere uso posterior del módulo; no hay despliegue incluido.
- Diff limitado a dependencia Actuator, configuración observabilidad, dos matchers Security, paquete infraestructura, tests nuevos, vista nueva y registro de ruta/menú ADMIN. **Sin modificaciones a controllers/services/repositorios/modelos de negocio, dashboard, migraciones SQL ni perfiles PostgreSQL dev/prod.**
- Trabajo sobre `develop`; sin commit, push, merge ni despliegue. Commit propuesto: `feat(infra): add admin observability and baseline snapshots (#22)`.

Comando reproducible (solo después de crear la BD temporal indicada):

```powershell
cd BACKEND
mvn.cmd -B '-Dinfra.test.url=jdbc:postgresql://127.0.0.1:55439/adrith_infra_issue22' '-Dspring.datasource.url=jdbc:postgresql://127.0.0.1:55439/adrith_infra_issue22' '-Dspring.datasource.username=postgres' '-Dspring.datasource.password=' '-Dspring.sql.init.mode=never' verify
```

## Archivos

Modificados: `BACKEND/pom.xml`, `BACKEND/src/main/resources/application.properties`, `BACKEND/src/main/java/com/AdrithStore/backend/security/SecurityConfig.java`, `FRONTEND/src/App.jsx`, `FRONTEND/src/components/layout/Layout.jsx`.

Nuevos: `BACKEND/src/main/java/com/AdrithStore/backend/infraestructura/{MetricasSnapshot,ProveedorMetricas,MetricasNativas,MetricasActividad,MetricasInfraestructuraService,InfraestructuraController}.java`, `BACKEND/src/test/java/com/AdrithStore/backend/{InfraestructuraMetricasTest,InfraestructuraIssue22IntegrationTest}.java`, `FRONTEND/src/pages/Infraestructura.jsx` y este documento.

Referencias primarias: [métricas Spring Boot](https://docs.spring.io/spring-boot/3.5/reference/actuator/metrics.html), [exposición Actuator](https://docs.spring.io/spring-boot/3.5/reference/actuator/endpoints.html), [defaults HikariCP 6.3.3](https://github.com/brettwooldridge/HikariCP/blob/HikariCP-6.3.3/src/main/java/com/zaxxer/hikari/HikariConfig.java), [semántica del keepalive y pool Hikari](https://github.com/brettwooldridge/HikariCP#configuration-knobs-baby).

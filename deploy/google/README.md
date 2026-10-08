# Preparacion Google TEST

Estado: base de empaquetado y configuracion. No desplegado. No usar con BD de produccion.

Arquitectura propuesta: React/Vite en Firebase Hosting, /api/** hacia Spring Boot en Cloud Run, PostgreSQL TEST accesible por TLS y bucket privado persistente para imagenes. Google y Neon son fases separables; preparar el contenedor no conecta Neon.

## Archivos

- BACKEND/Dockerfile: Java 21, build multietapa, usuario no root, perfil prod,cloud.
- BACKEND/.dockerignore: no copiar uploads, secretos locales ni compilados.
- application-cloud.properties: PORT/0.0.0.0, seed/Flyway/runner deshabilitados, validacion del esquema, pool TEST minimo 0/maximo 5/keepalive 0.
- DbMigrationRunner: activacion condicional con valor predeterminado true; se conserva comportamiento local y prod existente.
- firebase.test.json: API antes de fallback SPA; servicio TEST us-central1 y pinTag. Copiar a firebase.json en raiz antes de usar, o generar una configuracion con public resuelto desde la ubicacion que se entregue al CLI. No desplegar el ejemplo sin confirmar proyecto/region.

## Pendiente antes del primer despliegue

1. Confirmar ID de proyecto Google/Firebase, facturacion, region compartida compatible con Hosting y region de BD. us-central1 es solo propuesta inicial.
2. Preparar BD TEST con esquema/copia autorizada, TLS y credenciales propias. El backend no prepara una BD vacia en el perfil cloud. Nunca reutilizar DB_URL/JWT de produccion para TEST. No abrir PostgreSQL del cliente a Internet.
3. Crear servicio de ejecucion dedicado, Artifact Registry y secretos DB_URL, DB_USER, DB_PASSWORD, JWT_SECRET en Secret Manager. Dar acceso solo a secretos necesarios; no guardar credenciales en repo ni frontend.
4. Preparar bucket TEST privado y montaje Cloud Storage /mnt/imagenes; UPLOAD_DIR=/mnt/imagenes. Dar a la cuenta del servicio acceso limitado a objetos de ese bucket. Validar FUSE (escritura/lectura/sobrescritura/concurrencia) y persistencia tras reinicio antes de aceptar esta solucion. Alternativa: proveedor de almacenamiento via API.
5. Construir imagen linux/amd64. No se verifico Docker en esta maquina: no esta disponible en PATH. El Dockerfile requiere acceso a repositorios Maven e imagenes base.
6. Configurar Cloud Run TEST: empezar con 1 vCPU, 512 MiB, minimo 0, maximo 1 y concurrencia 8. Son parametros de prueba, no dimensionamiento validado; FUSE y JVM consumen memoria adicional. Medir y subir memoria si hace falta.
7. Configurar APP_FRONTEND_URL con origen Hosting TEST y servir frontend con API relativa /api (sin VITE_API_URL apuntando al cliente). Firebase Hosting requiere invocacion compatible de Cloud Run; si se habilita acceso publico al transporte, Spring Security sigue protegiendo la API con JWT. No publicar hasta validar setup/primer-admin y datos TEST.

## Validacion requerida

- Login ADMIN/VENDEDOR, permisos, ventas/compras/CPP/stock/tesoreria/dashboard usando solo datos TEST.
- Subida y lectura de imagen; sobrescritura de prod-id; lectura tras reemplazo de instancia. No ejecutar reparar-imagenes sobre produccion.
- Cold start, memoria total, concurrencia, errores y adquisiciones SQL; comprobar reposo de Neon cuando se conecte TEST.
- Carga /infraestructura y captura manual; HTTP/JVM son por instancia/revision, sin historial global.
- Confirmar esquema y ausencia de seed/DDL durante arranque cloud.

## Produccion y rollback

No hay corte autorizado ni automatico. Mantener instalacion cliente y PostgreSQL actuales operativos. Antes del corte, definir copia final, ventana sin escrituras, verificacion de consistencia y plan de retorno; no operar dos bases independientes con escrituras simultaneas. Rollback de Hosting/revision no revierte datos; debe planificarse aparte.

## Fuentes

- https://docs.cloud.google.com/run/docs/container-contract
- https://firebase.google.com/docs/hosting/cloud-run
- https://docs.cloud.google.com/run/docs/configuring/services/cloud-storage-volume-mounts

No se instalaron CLIs ni se crearon recursos, secretos, proyectos, buckets o bases de datos.

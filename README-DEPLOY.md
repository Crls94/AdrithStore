# Despliegue de AdrithStore en producción

Guía para llevar AdrithStore (backend Spring Boot 3.5/Java 21 + frontend React/Vite + PostgreSQL) a una máquina cliente separada, por primera vez y en actualizaciones futuras.

**Ambas máquinas (principal y cliente) son Windows y están conectadas por Tailscale.** Máquina cliente: `desktop-6m5le6v`, nombre completo en la tailnet: `desktop-6m5le6v.tail7a9fbb.ts.net`. No hay dominio público ni servidor Linux — todo lo de abajo usa rutas y comandos de Windows.

Convención de rutas usada en todo este documento (ajustar si en la máquina real usás otras):

| Ruta | Qué es |
|---|---|
| `C:\adrithstore\app` | Checkout del repo (`git clone`), backend + frontend |
| `C:\adrithstore\backend\backend.jar` | Jar del backend que corre el servicio (nombre fijo) |
| `C:\adrithstore\backend.env` | Variables de entorno reales del backend (secretos) |
| `C:\adrithstore\start-backend.ps1` / `install-service.ps1` | Wrapper + instalador del servicio Windows (NSSM) |
| `C:\adrithstore\tls\*.crt/.key` | Certificado real de Tailscale (`tailscale cert`) |
| `C:\adrithstore\Caddyfile` | Reverse proxy TLS |

---

## 0. Prerrequisitos en la máquina cliente (Windows)

- **Java 21 JRE**: `winget install EclipseAdoptium.Temurin.21.JRE`
- **PostgreSQL** (14+): instalador de https://www.postgresql.org/download/windows/
- **Node.js 20+ y npm**: `winget install OpenJS.NodeJS.LTS`
- **git**: `winget install Git.Git`
- **Caddy**: bajar el `.exe` de https://caddyserver.com/download y ponerlo en `C:\caddy\caddy.exe`
- **NSSM** (para correr el `.jar` como servicio, ya que Windows no tiene systemd): bajar de https://nssm.cc/download y poner `nssm.exe` en `C:\nssm\nssm.exe`
- **Tailscale** ya instalado y conectado en ambas máquinas (ya hecho — máquina cliente: `desktop-6m5le6v.tail7a9fbb.ts.net`)

Todo esto es instalación manual — no está automatizado por `deploy.ps1` (ver checklist al final).

---

## 1. Primera instalación

### 1.1. Clonar el repo

En PowerShell, en la máquina cliente:

```powershell
New-Item -ItemType Directory -Force -Path C:\adrithstore
cd C:\adrithstore
git clone <url-del-repo> app
cd app
```

### 1.2. Base de datos: migrar los datos reales existentes (una sola vez)

En **tu máquina actual** (donde está la BD real con ventas/compras/productos/usuarios), con `psql`/`pg_dump` de PostgreSQL en el PATH:

```powershell
pg_dump -h localhost -U postgres -d AdrithStore -F c -f adrithstore_backup.dump
```

Copiar `adrithstore_backup.dump` a la máquina cliente. Como ambas están en la misma tailnet, se puede usar `scp` directo (viene con Windows/Git):

```powershell
scp adrithstore_backup.dump usuario@desktop-6m5le6v.tail7a9fbb.ts.net:C:/adrithstore/
```

En la máquina cliente:

```powershell
createdb -U postgres AdrithStore
pg_restore -h localhost -U postgres -d AdrithStore --no-owner --no-privileges C:\adrithstore\adrithstore_backup.dump
```

Esto trae el esquema completo **y** los datos tal cual estaban. Flyway, al arrancar el backend por primera vez, va a detectar que la base ya tiene tablas y **no** va a intentar recrearlas — la marca como "baseline en V1" automáticamente (`spring.flyway.baseline-on-migrate=true` en `application.properties`) y sigue de ahí. No hay que correr ninguna migración a mano en este paso.

Si en cambio querés arrancar **sin** los datos actuales (una instalación limpia), no hace falta el `pg_dump`/`pg_restore`: alcanza con `createdb AdrithStore` vacía — el backend va a correr `V1__baseline.sql` (crea las 17 tablas desde cero) y después el seed de `data.sql` (categorías + catálogo base de productos) automáticamente al arrancar. *(Verificado: se probó este camino contra una base vacía y funciona de punta a punta.)*

### 1.3. Variables de entorno

```powershell
Copy-Item C:\adrithstore\app\deploy\backend.env.example C:\adrithstore\backend.env
notepad C:\adrithstore\backend.env   # completar DB_PASSWORD, JWT_SECRET, APP_FRONTEND_URL reales
```
`APP_FRONTEND_URL` ya debe quedar en `https://desktop-6m5le6v.tail7a9fbb.ts.net`.

Generar un `JWT_SECRET` real (no reusar el de desarrollo) — en PowerShell no hay `openssl` por defecto, usar esto en su lugar:
```powershell
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

Restringir el acceso al archivo (solo tu usuario/admin):
```powershell
icacls C:\adrithstore\backend.env /inheritance:r /grant:r "$env:USERNAME:F" "Administrators:F"
```

### 1.4. Build inicial

```powershell
cd C:\adrithstore\app\BACKEND
.\mvnw.cmd clean package -DskipTests
New-Item -ItemType Directory -Force -Path C:\adrithstore\backend
Copy-Item (Get-ChildItem target\backend-*.jar | Where-Object { $_.Name -notlike "*.original" } | Select-Object -First 1).FullName C:\adrithstore\backend\backend.jar

cd C:\adrithstore\app\FRONTEND
npm ci
npm run build
```

### 1.5. Servicio Windows (NSSM, reemplaza a systemd)

```powershell
Copy-Item C:\adrithstore\app\deploy\windows\start-backend.ps1 C:\adrithstore\start-backend.ps1
cd C:\adrithstore\app
.\deploy\windows\install-service.ps1     # correr como Administrador, una sola vez
Start-Service AdrithStoreBackend
Get-Service AdrithStoreBackend           # debe decir "Running"
Get-Content C:\adrithstore\logs\backend-out.log -Tail 50   # revisar que Flyway/arranque salieron bien
```

### 1.6. TLS con Tailscale (bloqueante — no saltear)

Sin esto, el JWT y las contraseñas viajan en texto plano por la red. En la máquina cliente:

```powershell
New-Item -ItemType Directory -Force -Path C:\adrithstore\tls
cd C:\adrithstore\tls
tailscale cert desktop-6m5le6v.tail7a9fbb.ts.net
```
Esto genera `desktop-6m5le6v.tail7a9fbb.ts.net.crt` y `.key` ahí mismo (rutas ya usadas en `deploy/Caddyfile`).

```powershell
Copy-Item C:\adrithstore\app\deploy\Caddyfile C:\adrithstore\Caddyfile
C:\caddy\caddy.exe run --config C:\adrithstore\Caddyfile
```
Para que Caddy quede corriendo siempre, instalarlo también como servicio con NSSM (mismo mecanismo que el backend, apuntando a `caddy.exe run --config C:\adrithstore\Caddyfile`).

Tailscale avisa cuando el certificado esté por vencer (cada ~90 días) — hay que correr `tailscale cert` de nuevo y reiniciar Caddy.

### 1.7. Verificar

Desde la máquina principal (misma tailnet):
```powershell
curl.exe -I https://desktop-6m5le6v.tail7a9fbb.ts.net/api/auth/estado   # debe dar 200
```
Entrar desde el navegador a `https://desktop-6m5le6v.tail7a9fbb.ts.net`, y crear el primer admin (`/primer-admin`, solo funciona si la base está vacía de usuarios) o loguearte con un usuario ya migrado del `pg_restore`. Solo es accesible desde dispositivos conectados a esta tailnet.

---

## 2. Actualizaciones futuras

Flujo normal, sin volver a tocar nada de esto:

```
(tu máquina) git push
(máquina cliente) cd C:\adrithstore\app; .\deploy\windows\deploy.ps1
```

`deploy.ps1` hace `git pull` + build de backend y frontend + reinicia el servicio NSSM. **Flyway aplica solo los cambios de esquema nuevos** (los archivos `V2__algo.sql`, `V3__otra_cosa.sql`, etc. que agregues a `BACKEND/src/main/resources/db/migration/`) al arrancar — nunca toca los datos existentes, solo la estructura, y solo lo que todavía no se aplicó.

Para agregar un cambio de esquema en el futuro: crear un archivo nuevo `BACKEND/src/main/resources/db/migration/V2__descripcion_corta.sql` (nunca modificar `V1__baseline.sql` ni ningún script ya aplicado — Flyway rechaza migraciones ya ejecutadas si detecta que el archivo cambió). Commitear ese archivo junto con el código que lo necesita, y el próximo `deploy.sh` lo aplica solo.

---

## 3. Checklist — qué queda pendiente de hacer manualmente

- [ ] Instalar Java 21, PostgreSQL, Node/npm, git, Caddy y NSSM en la máquina cliente (`desktop-6m5le6v`).
- [x] Tailscale conectando ambas máquinas (`desktop-6m5le6v.tail7a9fbb.ts.net`) — ya hecho.
- [ ] Generar los valores reales de `C:\adrithstore\backend.env` (`DB_PASSWORD`, `JWT_SECRET`, `APP_FRONTEND_URL`).
- [ ] Correr el `pg_dump` en esta máquina y el `pg_restore` en la máquina cliente.
- [ ] Ejecutar la instalación inicial completa (secciones 1.1 a 1.7 de arriba).
- [ ] Correr `tailscale cert` en la máquina cliente y dejar Caddy corriendo (como servicio NSSM).
- [ ] Guardar `C:\adrithstore\backend.env` y el backup de la BD en un lugar seguro fuera de la máquina (si se pierde el disco, se pierde todo).

# Script de actualizacion para la maquina de produccion (cliente, Windows).
# Corre DESDE la maquina cliente, parado en el checkout del repo
# (se asume C:\adrithstore\app - ver README-DEPLOY.md).
#
# Uso (PowerShell, como Administrador):
#   cd C:\adrithstore\app
#   .\deploy\windows\deploy.ps1
#
# Que hace, en orden: git pull -> build backend (jar) -> copiar jar ->
# build frontend -> reiniciar servicio NSSM.
#
# Los cambios de esquema los aplica Flyway solo al arrancar el backend - no
# hace falta correr nada de BD a mano en actualizaciones normales.

$ErrorActionPreference = "Stop"

$repoDir = "C:\adrithstore\app"
$jarDest = "C:\adrithstore\backend\backend.jar"
$serviceName = "AdrithStoreBackend"

Set-Location $repoDir

Write-Host "==> git pull"
git pull

Write-Host "==> Backend: build (mvnw clean package -DskipTests)"
Set-Location "$repoDir\BACKEND"
.\mvnw.cmd clean package -DskipTests

Write-Host "==> Copiando jar a $jarDest"
$jarFile = Get-ChildItem "target\backend-*.jar" | Where-Object { $_.Name -notlike "*.original" } | Select-Object -First 1
Copy-Item $jarFile.FullName $jarDest -Force

Write-Host "==> Frontend: build (npm ci + npm run build)"
Set-Location "$repoDir\FRONTEND"
npm ci
npm run build

Write-Host "==> Reiniciando servicio $serviceName"
Restart-Service $serviceName
Start-Sleep -Seconds 3
Get-Service $serviceName

Write-Host "==> Listo. Logs: Get-Content C:\adrithstore\logs\backend-out.log -Wait -Tail 50"

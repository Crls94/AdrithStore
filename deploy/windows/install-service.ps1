# Instala el backend de AdrithStore como servicio de Windows, usando NSSM
# (systemd no existe en Windows - NSSM hace el mismo trabajo: mantener el
# proceso corriendo, reiniciarlo si se cae, arrancarlo solo con el sistema).
#
# Prerrequisito: bajar NSSM (https://nssm.cc/download), descomprimir, y poner
# nssm.exe (la version win64) en C:\nssm\nssm.exe
#
# Correr este script UNA sola vez, como Administrador, despues de tener
# C:\adrithstore\backend\backend.jar y C:\adrithstore\backend.env ya listos
# (ver README-DEPLOY.md).

$nssm = "C:\nssm\nssm.exe"
$serviceName = "AdrithStoreBackend"
$scriptPath = "C:\adrithstore\start-backend.ps1"

if (-not (Test-Path $nssm)) {
    Write-Error "No se encontro $nssm - bajar NSSM de https://nssm.cc/download y ponerlo ahi."
    exit 1
}

& $nssm install $serviceName "powershell.exe" "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
& $nssm set $serviceName AppDirectory "C:\adrithstore"
& $nssm set $serviceName DisplayName "AdrithStore Backend"
& $nssm set $serviceName Description "Backend Spring Boot de AdrithStore (perfil prod)"
& $nssm set $serviceName Start SERVICE_AUTO_START
& $nssm set $serviceName AppExit Default Restart
& $nssm set $serviceName AppRestartDelay 5000
& $nssm set $serviceName AppStdout "C:\adrithstore\logs\backend-out.log"
& $nssm set $serviceName AppStderr "C:\adrithstore\logs\backend-err.log"

New-Item -ItemType Directory -Force -Path "C:\adrithstore\logs" | Out-Null

Write-Host "Servicio '$serviceName' instalado."
Write-Host "Arrancarlo:  Start-Service $serviceName"
Write-Host "Ver estado:  Get-Service $serviceName"
Write-Host "Logs:        Get-Content C:\adrithstore\logs\backend-out.log -Wait -Tail 50"

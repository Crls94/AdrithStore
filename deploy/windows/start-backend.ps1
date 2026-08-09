# Wrapper que carga las variables de entorno reales desde backend.env y
# arranca el backend. Windows no tiene el "EnvironmentFile=" de systemd, asi
# que este script hace ese trabajo. NSSM corre ESTE script, no java.exe
# directo (ver install-service.ps1).
#
# Ubicacion esperada: C:\adrithstore\start-backend.ps1
# Variables reales en: C:\adrithstore\backend.env (copiar de
# deploy/backend.env.example y completar - NUNCA commitear ese archivo).

$envFile = "C:\adrithstore\backend.env"

if (-not (Test-Path $envFile)) {
    Write-Error "No se encontro $envFile - copiar deploy/backend.env.example ahi y completar los valores reales."
    exit 1
}

Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        $parts = $line -split "=", 2
        if ($parts.Length -eq 2) {
            [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
        }
    }
}

$jar = "C:\adrithstore\backend\backend.jar"

& java -jar $jar --spring.profiles.active=prod

#!/usr/bin/env bash
# NOTA: la maquina cliente actual (desktop-6m5le6v) es Windows, no Linux.
# Para esa maquina usar deploy/windows/deploy.ps1 en vez de este script.
# Este queda documentado por si en el futuro se migra esa maquina a Linux.
#
# Script de actualizacion para la maquina de produccion (cliente).
# Se corre DESDE la maquina cliente, parado en el checkout del repo
# (se asume /opt/adrithstore/app, ver README-DEPLOY.md).
#
# Uso:
#   cd /opt/adrithstore/app
#   ./deploy/deploy.sh
#
# Que hace, en orden:
#   1. git pull (trae el codigo nuevo)
#   2. mvn clean package -DskipTests (backend -> jar nuevo)
#   3. copia el jar a /opt/adrithstore/backend/backend.jar (nombre fijo, lo
#      que systemd espera - ver adrithstore-backend.service)
#   4. npm ci + npm run build (frontend -> FRONTEND/dist, que el proxy TLS
#      sirve directo, sin copiar a otro lado)
#   5. reinicia el servicio systemd del backend
#
# Los cambios de esquema (si los hay) los aplica Flyway automaticamente al
# arrancar el backend (paso 5) - no hace falta correr nada de BD a mano en
# actualizaciones normales, solo en la migracion inicial de datos (ver
# README-DEPLOY.md).

set -euo pipefail

REPO_DIR="/opt/adrithstore/app"
JAR_DEST="/opt/adrithstore/backend/backend.jar"
SERVICE_NAME="adrithstore-backend"

cd "$REPO_DIR"

echo "==> git pull"
git pull

echo "==> Backend: build (mvn clean package -DskipTests)"
cd "$REPO_DIR/BACKEND"
./mvnw clean package -DskipTests

echo "==> Copiando jar a $JAR_DEST"
JAR_FILE=$(ls target/backend-*.jar | grep -v ".original" | head -n1)
sudo cp "$JAR_FILE" "$JAR_DEST"

echo "==> Frontend: build (npm ci + npm run build)"
cd "$REPO_DIR/FRONTEND"
npm ci
npm run build

echo "==> Reiniciando $SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"
sleep 3
sudo systemctl status "$SERVICE_NAME" --no-pager

echo "==> Listo. Logs en vivo: journalctl -u $SERVICE_NAME -f"

#!/usr/bin/env bash
# Run on the VPS from repo root: bash scripts/deploy-vps.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PUBLIC_HOST="${PUBLIC_HOST:-31.97.189.252}"

if [[ ! -f .env ]]; then
  echo "Copy .env.production.example to .env and set JWT secrets first."
  cp .env.production.example .env
  exit 1
fi

echo "=== Docker: API :3101 + Web :5175 ==="
docker compose up -d --build

echo ""
echo "Open firewall (if ufw is enabled):"
echo "  sudo ufw allow 3101/tcp"
echo "  sudo ufw allow 5175/tcp"
echo ""
echo "Web:  http://${PUBLIC_HOST}:5175"
echo "API:  http://${PUBLIC_HOST}:3101"
echo "Health: curl http://${PUBLIC_HOST}:5175/health"

#!/usr/bin/env bash
# Bare-metal VPS (no Docker): API on 3101, web on 5175
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Server build + start :3101 ==="
cd "$ROOT/server"
npm run build
# Stop old process on 3101 if needed, then:
nohup npm start > ../logs/server.log 2>&1 &
echo "API PID $!"

echo "=== Web build + start :5175 (0.0.0.0) ==="
cd "$ROOT/web"
pnpm install
pnpm build
export HOST=0.0.0.0
export PORT=5175
export VITE_PROXY_TARGET=http://127.0.0.1:3101
nohup pnpm preview > ../logs/web.log 2>&1 &
echo "Web PID $!"

echo ""
echo "Ensure firewall allows 5175/tcp and 3101/tcp"
echo "Test: curl -s http://127.0.0.1:5175/health"

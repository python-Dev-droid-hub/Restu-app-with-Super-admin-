# Deploy API + production web on VPS (run from repo root on the server)
# Usage: .\scripts\deploy-vps.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Write-Host '=== API (port 3101) ===' -ForegroundColor Cyan
Set-Location (Join-Path $root 'server')
npm run build
# Stop existing node on 3101 if needed:
# Get-NetTCPConnection -LocalPort 3101 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd '$((Get-Location).Path)'; npm start" -WindowStyle Minimized

Write-Host '=== Web (port 5175, proxies /api -> 3101) ===' -ForegroundColor Cyan
Set-Location (Join-Path $root 'web')
$env:VITE_PROXY_TARGET = 'http://127.0.0.1:3101'
pnpm install
pnpm build
# Must use serve-prod (not preview:vite) for correct /api proxy
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd '$((Get-Location).Path)'; `$env:VITE_PROXY_TARGET='http://127.0.0.1:3101'; pnpm preview" -WindowStyle Minimized

Write-Host ''
Write-Host 'Open: http://YOUR_VPS_IP:5175' -ForegroundColor Green
Write-Host 'server/.env: SERVER_URL=http://YOUR_VPS_IP:3101, CORS_ORIGIN=http://YOUR_VPS_IP:5175, COOKIE_SECURE=false' -ForegroundColor Yellow

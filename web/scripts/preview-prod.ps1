# Run production build with API proxy (use on VPS: API on 127.0.0.1:3101, web on :5175)
$env:VITE_API_URL = '/api'
$env:VITE_PROXY_TARGET = 'http://127.0.0.1:3101'
Set-Location $PSScriptRoot\..

if (-not (Test-Path 'dist\index.html')) {
  Write-Host 'Building...'
  pnpm build
}

Write-Host 'Starting on http://0.0.0.0:5175 (API proxied to' $env:VITE_PROXY_TARGET ')'
pnpm preview

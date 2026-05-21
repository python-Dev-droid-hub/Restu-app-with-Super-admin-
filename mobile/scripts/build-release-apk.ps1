# Standalone Android release APK (Gradle) — no Expo Go, no Metro/Wi‑Fi required.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$ApiUrl = if ($env:EXPO_PUBLIC_API_URL_PRODUCTION) { $env:EXPO_PUBLIC_API_URL_PRODUCTION } else { "http://31.97.189.252:3101/api" }

$env:EXPO_PUBLIC_API_URL_PRODUCTION = $ApiUrl
$env:EXPO_PUBLIC_APP_ENV = "production"
$env:CI = "1"

Write-Host "Standalone Gradle release APK"
Write-Host "API URL (embedded in app): $ApiUrl"
Write-Host ""

if (-not $env:ANDROID_HOME) {
  Write-Host "ANDROID_HOME is not set." -ForegroundColor Red
  exit 1
}

Write-Host "[1/2] expo prebuild (native android project)..."
npx expo prebuild --platform android --clean --no-install

Write-Host "[2/2] gradlew assembleRelease..."
Set-Location "$Root\android"
.\gradlew.bat assembleRelease --no-daemon -x lint -x test

$Apk = Get-ChildItem -Path "app\build\outputs\apk\release" -Filter "*.apk" | Select-Object -First 1
if (-not $Apk) {
  Write-Host "APK not found." -ForegroundColor Red
  exit 1
}

$OutDir = "$Root\build-output"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$Dest = "$OutDir\restaurant-app-release-gradle.apk"
Copy-Item $Apk.FullName $Dest -Force

Write-Host ""
Write-Host "APK ready:" -ForegroundColor Green
Write-Host $Dest
Write-Host ("Size: {0:N2} MB" -f ((Get-Item $Dest).Length / 1MB))

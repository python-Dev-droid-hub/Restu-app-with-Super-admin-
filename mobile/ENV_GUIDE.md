# Local + production at the same time

This is **not** a port conflict between your PC and the VPS. Both can run on port **3101** on different machines.

The issue is **which URL each client is configured to use**.

## How it works

| Client | Points to | When |
|--------|-----------|------|
| `npx expo start` (Expo Go / dev) | Your PC/LAN `http://192.168.x.x:3101/api` | Default (`EXPO_PUBLIC_API_TARGET=local`) |
| Release APK (Gradle build) | VPS `http://31.97.189.252:3101/api` | Baked in at build time — **cannot switch without rebuild** |
| Web `pnpm dev` | `http://127.0.0.1:3101` via Vite proxy | `web/.env` → `VITE_PROXY_TARGET` |

## Run both backends together

**Terminal 1 — local API**

```powershell
cd server
# server/.env: PORT=3101, MONGODB_URI=mongodb://localhost:27019/restaurant_app
pnpm dev
```

**Terminal 2 — mobile against local**

```powershell
cd mobile
# mobile/.env:
#   EXPO_PUBLIC_APP_ENV=development
#   EXPO_PUBLIC_API_TARGET=local
#   EXPO_PUBLIC_API_DEV_PORT=3101
# Do NOT set EXPO_PUBLIC_API_URL to the VPS IP here.
npx expo start
```

Check Metro logs: `[API] Base URL: http://192.168.x.x:3101/api`

**Terminal 3 — web against local**

```powershell
cd web
# web/.env: VITE_PROXY_TARGET=http://127.0.0.1:3101
pnpm dev
```

**Production (VPS)** keeps running separately. Nothing on your PC needs to stop.

## Common mistakes

1. **`EXPO_PUBLIC_API_URL` set to the VPS IP** in `mobile/.env`  
   Dev mode will call production, not localhost. Remove it or use your LAN IP only.

2. **Testing with the release APK while expecting localhost**  
   `build-release-apk.ps1` sets `EXPO_PUBLIC_APP_ENV=production` and embeds the VPS URL. Use **Expo dev** for local.

3. **Local server not running**  
   Expo still points to `192.168.x.x:3101` but nothing is listening → network error (not a port clash with VPS).

4. **Only one process on port 3101 on the same PC**  
   You cannot run two APIs on `localhost:3101` on Windows. Use one local server OR point Vite/mobile to the VPS — not both on the same port locally.

5. **Same MongoDB for local and prod**  
   If `server/.env` `MONGODB_URI` points to Atlas/production while you think you are on “local data”, behavior will look like “production”.

## Expo dev: hit production without rebuilding APK

In `mobile/.env`:

```env
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_TARGET=production
EXPO_PUBLIC_API_URL_PRODUCTION=http://31.97.189.252:3101/api
```

Restart Expo (`npx expo start -c`).

## Build APK for production only

```powershell
cd mobile
$env:EXPO_PUBLIC_API_URL_PRODUCTION="http://31.97.189.252:3101/api"
$env:EXPO_PUBLIC_APP_ENV="production"
.\scripts\build-release-apk.ps1
```

## Web dev against production VPS

`web/.env`:

```env
VITE_PROXY_TARGET=http://31.97.189.252:3101
```

Restart `pnpm dev`.

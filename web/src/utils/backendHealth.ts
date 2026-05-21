/** User-facing message when API/socket cannot connect in production. */
export const BACKEND_UNREACHABLE_MSG =
  'Cannot reach the API. Ensure the backend is running on port 3101 and the web server proxies to it (Docker: VITE_PROXY_TARGET=http://server:3101; bare VPS: http://127.0.0.1:3101).';

export async function isApiReachable(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { credentials: 'include' });
    return res.ok;
  } catch {
    return false;
  }
}

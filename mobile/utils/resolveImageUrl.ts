import { api } from '../components/api/client';

/**
 * Build an absolute image URL for React Native Image (uploads are served at /uploads, not /api/uploads).
 */
export function resolveImageUrl(imagePath?: string | null): string | null {
  if (!imagePath) return null;

  const raw = String(imagePath).trim().replace(/\\/g, '/');
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) {
    return raw;
  }

  const apiBase = api.getBaseURL().replace(/\/$/, '');
  const origin = apiBase.replace(/\/?api\/?$/, '');

  let path = raw;
  if (path.startsWith('src/uploads/')) {
    path = `/${path.replace(/^src\//, '')}`;
  } else if (path.startsWith('uploads/')) {
    path = `/${path}`;
  }

  if (path.startsWith('/api/uploads/')) {
    path = path.replace(/^\/api/, '');
  }

  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  if (path.startsWith('/uploads/')) {
    return `${origin}${path}`;
  }

  if (path.startsWith('/api/')) {
    return `${origin}${path}`;
  }

  return `${apiBase}${path}`;
}

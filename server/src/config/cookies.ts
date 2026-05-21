export type AuthCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  domain?: string;
  path: '/';
};

/** Cookie settings safe for HTTP VPS (same host, different ports) and HTTPS production. */
export function getAuthCookieOptions(): AuthCookieOptions {
  const isProd = process.env.NODE_ENV === 'production';
  const serverUrl = (process.env.SERVER_URL || '').trim().toLowerCase();
  const serverIsHttps = serverUrl.startsWith('https://');

  const secureFlag = process.env.COOKIE_SECURE?.trim().toLowerCase();
  const secure =
    secureFlag === 'true' ? true : secureFlag === 'false' ? false : isProd ? serverIsHttps : false;

  const sameSiteEnv = process.env.COOKIE_SAMESITE?.trim().toLowerCase();
  let sameSite: 'lax' | 'strict' | 'none' =
    sameSiteEnv === 'none' || sameSiteEnv === 'strict' || sameSiteEnv === 'lax'
      ? sameSiteEnv
      : secure
        ? 'none'
        : 'lax';

  if (sameSite === 'none' && !secure) {
    sameSite = 'lax';
  }

  const domain = process.env.COOKIE_DOMAIN?.trim() || undefined;

  return {
    httpOnly: true,
    secure,
    sameSite,
    domain,
    path: '/',
  };
}

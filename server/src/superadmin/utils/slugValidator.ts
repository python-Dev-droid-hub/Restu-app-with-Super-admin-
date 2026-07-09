const RESERVED_SLUGS = new Set([
  'www', 'app', 'api', 'admin', 'superadmin', 'mail', 'smtp', 'ftp',
  'blog', 'help', 'support', 'billing', 'status',
]);

export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

export function validateSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug || slug.length < 3) {
    return { valid: false, error: 'Slug must be at least 3 characters' };
  }
  if (slug.length > 50) {
    return { valid: false, error: 'Slug cannot exceed 50 characters' };
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { valid: false, error: 'Slug may only contain lowercase letters, numbers, and hyphens' };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { valid: false, error: `"${slug}" is a reserved subdomain` };
  }
  return { valid: true };
}

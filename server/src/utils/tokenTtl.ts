/** Parse JWT_EXPIRE style strings (e.g. 30m, 7d) to milliseconds for cookies. */
export function parseDurationToMs(value: string, fallbackMs: number): number {
  const trimmed = (value || '').trim();
  const match = /^(\d+)([smhd])$/i.exec(trimmed);
  if (!match) return fallbackMs;
  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * (multipliers[unit] || 0) || fallbackMs;
}

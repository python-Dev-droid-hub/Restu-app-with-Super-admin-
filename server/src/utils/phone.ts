/** Normalize phone to E.164-style +923XXXXXXXXX (Pakistan default). */
export function normalizePhoneNumber(raw: string, countryCode = '92'): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return trimmed;

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return trimmed;

  // 03044996996 (11 digits, local PK mobile)
  if (digits.startsWith('0') && digits.length >= 10 && digits.length <= 11) {
    return `+${countryCode}${digits.slice(1)}`;
  }

  // 923044996996 or 923001234567
  if (digits.startsWith(countryCode)) {
    return `+${digits}`;
  }

  // 3044996996 (10-digit mobile without leading 0)
  if (digits.length === 10 && digits.startsWith('3')) {
    return `+${countryCode}${digits}`;
  }

  if (trimmed.startsWith('+')) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

export function isValidPhoneNumber(raw: string): boolean {
  const normalized = normalizePhoneNumber(raw);
  return /^\+[1-9]\d{7,14}$/.test(normalized);
}

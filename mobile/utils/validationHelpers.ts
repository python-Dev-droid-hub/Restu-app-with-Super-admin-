// Validation Helpers

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (10-15 digits)
 */
export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,16}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Validate password (min 6 characters)
 */
export function isValidPassword(password: string): boolean {
  return password !== undefined && password !== null && password.length >= 6;
}

/**
 * Validate name (min 2 characters, letters only)
 */
export function isValidName(name: string): boolean {
  return name !== undefined && name !== null && name.trim().length >= 2;
}

/**
 * Validate address
 */
export function isValidAddress(address: string): boolean {
  return address !== undefined && address !== null && address.trim().length >= 10;
}

/**
 * Validate pincode (6 digits)
 */
export function isValidPincode(pincode: string): boolean {
  const pincodeRegex = /^\d{6}$/;
  return pincodeRegex.test(pincode);
}

/**
 * Validate card number (16 digits)
 */
export function isValidCardNumber(card: string): boolean {
  const cardRegex = /^\d{16}$/;
  return cardRegex.test(card.replace(/\s/g, ''));
}

/**
 * Validate CVV (3-4 digits)
 */
export function isValidCVV(cvv: string): boolean {
  const cvvRegex = /^\d{3,4}$/;
  return cvvRegex.test(cvv);
}

/**
 * Validate expiry date (MM/YY format)
 */
export function isValidExpiry(expiry: string): boolean {
  const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
  if (!expiryRegex.test(expiry)) return false;
  
  const [month, year] = expiry.split('/');
  const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
  const now = new Date();
  
  return expiryDate > now;
}

/**
 * Validate if value is not empty
 */
export function isNotEmpty(value: any): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
  return value !== null && value !== undefined;
}

/**
 * Validate number is positive
 */
export function isPositiveNumber(value: number): boolean {
  return typeof value === 'number' && value > 0;
}

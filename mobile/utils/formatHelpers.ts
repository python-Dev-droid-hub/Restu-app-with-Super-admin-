import { colors } from '../theme';
import { useSettings } from '../context/SettingsContext';

/**
 * Hook to get formatPrice with dynamic currency from settings
 */
export function useFormatPrice() {
  const { currencySymbol } = useSettings();
  
  return (amount: number): string => {
    if (amount === undefined || amount === null) return `${currencySymbol}0`;
    return `${currencySymbol}${amount.toFixed(0)}`;
  };
}

/**
 * Format price with currency symbol (static fallback - use useFormatPrice hook for dynamic)
 */
export function formatPrice(amount: number, currency: string = '₹'): string {
  if (amount === undefined || amount === null) return `${currency}0`;
  return `${currency}${amount.toFixed(0)}`;
}

/**
 * Format price with decimal
 */
export function formatPriceDecimal(amount: number, currency: string = '₹'): string {
  if (amount === undefined || amount === null) return `${currency}0.00`;
  return `${currency}${amount.toFixed(2)}`;
}

/**
 * Calculate discount percentage
 */
export function formatDiscount(originalPrice: number, currentPrice: number): string {
  if (!originalPrice || !currentPrice || originalPrice <= currentPrice) return '';
  const discount = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  return `${discount}% OFF`;
}

/**
 * Format time (e.g., "2:30 PM")
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date (e.g., "Oct 5, 2024")
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  
  return formatDate(d);
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert to title case
 */
export function toTitleCase(str: string): string {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

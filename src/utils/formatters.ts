/**
 * Currency and number formatting utilities
 * Provides functions for parsing and formatting Brazilian Real (BRL) currency
 */

/**
 * Parse a Brazilian Real currency string to a number
 * @param value - String in format "R$ 1.234,56" or "1.234,56"
 * @returns Parsed number value or 0 if invalid
 * @example
 * parseCurrencyBR("R$ 1.234,56") // returns 1234.56
 * parseCurrencyBR("1.234,56") // returns 1234.56
 * parseCurrencyBR("invalid") // returns 0
 */
export function parseCurrencyBR(value: string): number {
  if (!value || typeof value !== 'string') {
    return 0;
  }

  // Remove R$ symbol and whitespace
  let cleanValue = value.replace(/R\$\s?/g, '').trim();
  
  // Remove thousand separators (dots)
  cleanValue = cleanValue.replace(/\./g, '');
  
  // Replace decimal comma with dot
  cleanValue = cleanValue.replace(',', '.');
  
  // Parse to float
  const parsed = parseFloat(cleanValue);
  
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format a number as Brazilian Real currency
 * @param value - Number to format
 * @param options - Formatting options
 * @returns Formatted currency string (e.g., "R$ 1.234,56")
 * @example
 * formatCurrency(1234.56) // returns "R$ 1.234,56"
 * formatCurrency(1234.56, { includeSymbol: false }) // returns "1.234,56"
 * formatCurrency(1234.567) // returns "R$ 1.234,57" (rounded)
 */
export function formatCurrency(
  value: number | string | null | undefined,
  options: {
    includeSymbol?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string {
  const {
    includeSymbol = true,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  // Convert to number if string
  let numValue: number;
  if (typeof value === 'string') {
    numValue = parseCurrencyBR(value);
  } else if (typeof value === 'number') {
    numValue = value;
  } else {
    numValue = 0;
  }

  // Format using Intl.NumberFormat for proper localization
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(numValue);

  return includeSymbol ? `R$ ${formatted}` : formatted;
}

/**
 * Format a number with Brazilian thousand/decimal separators (no currency symbol)
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string (e.g., "1.234,56")
 * @example
 * formatNumber(1234.56) // returns "1.234,56"
 * formatNumber(1234.567, 3) // returns "1.234,567"
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

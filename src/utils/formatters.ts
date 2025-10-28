/**
 * Currency and number formatting utilities
 * Provides functions for parsing and formatting Brazilian Real (BRL) currency
 */

/**
 * Remove tag prefix from name string
 * Removes initial bracketed tags like [T448] from names
 * @param name - String that may contain a tag prefix like "[T448]Name"
 * @returns String without the prefix or undefined if input is null/undefined
 * @example
 * stripTagFromName("[T448]Loisiane") // returns "Loisiane"
 * stripTagFromName("Loisiane") // returns "Loisiane"
 * stripTagFromName(undefined) // returns undefined
 */
export function stripTagFromName(name: string | undefined | null): string | undefined {
  if (name === null || name === undefined) {
    return undefined;
  }
  
  // Remove pattern like [T448] or [TAG] from the beginning of the string
  const cleaned = name.replace(/^\[.*?\]\s*/, '');
  return cleaned;
}

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
 * Parse Brazilian currency values to number
 * Accepts strings like "R$ 6,00", "1.234,56", or numeric values
 * @param raw - Value to parse (can be string, number, null, or undefined)
 * @returns Parsed number value or 0 if invalid
 * @example
 * parseBrazilianCurrency("R$ 6,00") // returns 6.00
 * parseBrazilianCurrency("1.234,56") // returns 1234.56
 * parseBrazilianCurrency(6) // returns 6
 * parseBrazilianCurrency(null) // returns 0
 */
export function parseBrazilianCurrency(raw: string | number | null | undefined): number {
  // Handle null/undefined
  if (raw === null || raw === undefined) {
    return 0;
  }
  
  // If already a number, return it
  if (typeof raw === 'number') {
    return isNaN(raw) ? 0 : raw;
  }
  
  // If not a string, return 0
  if (typeof raw !== 'string') {
    return 0;
  }
  
  // Reuse existing parseCurrencyBR for string parsing
  return parseCurrencyBR(raw);
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

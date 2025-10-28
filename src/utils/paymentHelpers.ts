/**
 * Payment Helper Utilities
 * Functions to normalize payment data from Bitrix
 */

/**
 * Strip tag prefix from name (e.g., "[T448]Loisiane Gomes" -> "Loisiane Gomes")
 * Removes any prefix in the format [XXX] at the beginning of the name
 * 
 * @param name - The name that may contain a tag prefix
 * @returns The name without the tag prefix, or undefined if input is null/undefined
 * @example
 * stripTagFromName("[T448]Loisiane Gomes de Oliveira") // returns "Loisiane Gomes de Oliveira"
 * stripTagFromName("John Doe") // returns "John Doe"
 * stripTagFromName(null) // returns undefined
 */
export function stripTagFromName(name: string | undefined | null): string | undefined {
  if (!name) {
    return undefined;
  }

  // Remove any [XXX] prefix at the start of the string
  // Pattern: [anything] at the beginning, followed by the actual name
  const cleaned = name.replace(/^\[.*?\]\s*/, '');
  
  return cleaned || undefined;
}

/**
 * Parse Brazilian currency value to number
 * Handles various formats: "R$ 6,00", "6,00", "1.234,56", 6.0, etc.
 * 
 * @param raw - The value to parse (string or number)
 * @returns Parsed number value, or 0 if invalid/null
 * @example
 * parseBrazilianCurrency("R$ 6,00") // returns 6.00
 * parseBrazilianCurrency("1.234,56") // returns 1234.56
 * parseBrazilianCurrency(6.5) // returns 6.5
 * parseBrazilianCurrency(null) // returns 0
 * parseBrazilianCurrency("invalid") // returns 0
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

  // If not a string at this point, return 0
  if (typeof raw !== 'string') {
    return 0;
  }

  // Remove R$ symbol and whitespace
  let cleanValue = raw.replace(/R\$\s?/g, '').trim();
  
  // Remove thousand separators (dots in Brazilian format)
  cleanValue = cleanValue.replace(/\./g, '');
  
  // Replace decimal comma with dot (Brazilian format uses comma for decimals)
  cleanValue = cleanValue.replace(',', '.');
  
  // Parse to float
  const parsed = parseFloat(cleanValue);
  
  return isNaN(parsed) ? 0 : parsed;
}

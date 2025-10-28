import { describe, it, expect } from 'vitest';
import {
  stripTagFromName,
  parseBrazilianCurrency,
  parseCurrencyBR,
  formatCurrency,
  formatNumber,
} from '../formatters';

describe('formatters', () => {
  describe('stripTagFromName', () => {
    it('should remove tag prefix from name', () => {
      expect(stripTagFromName('[T448]Loisiane')).toBe('Loisiane');
      expect(stripTagFromName('[T448]Loisiane Gomes de Oliveira')).toBe('Loisiane Gomes de Oliveira');
      expect(stripTagFromName('[TAG]John Doe')).toBe('John Doe');
    });

    it('should handle names without tags', () => {
      expect(stripTagFromName('Loisiane')).toBe('Loisiane');
      expect(stripTagFromName('John Doe')).toBe('John Doe');
    });

    it('should handle empty strings', () => {
      expect(stripTagFromName('')).toBe('');
    });

    it('should handle null and undefined', () => {
      expect(stripTagFromName(null)).toBeUndefined();
      expect(stripTagFromName(undefined)).toBeUndefined();
    });

    it('should handle tag with spaces after', () => {
      expect(stripTagFromName('[T448] Loisiane')).toBe('Loisiane');
      expect(stripTagFromName('[T123]  Name With Spaces')).toBe('Name With Spaces');
    });
  });

  describe('parseBrazilianCurrency', () => {
    it('should parse Brazilian currency strings', () => {
      expect(parseBrazilianCurrency('R$ 6,00')).toBe(6.00);
      expect(parseBrazilianCurrency('R$ 1.234,56')).toBe(1234.56);
      expect(parseBrazilianCurrency('R$10,50')).toBe(10.50);
    });

    it('should parse strings without currency symbol', () => {
      expect(parseBrazilianCurrency('6,00')).toBe(6.00);
      expect(parseBrazilianCurrency('1.234,56')).toBe(1234.56);
      expect(parseBrazilianCurrency('10,50')).toBe(10.50);
    });

    it('should handle numeric inputs', () => {
      expect(parseBrazilianCurrency(6)).toBe(6);
      expect(parseBrazilianCurrency(6.0)).toBe(6.0);
      expect(parseBrazilianCurrency(1234.56)).toBe(1234.56);
    });

    it('should handle null and undefined', () => {
      expect(parseBrazilianCurrency(null)).toBe(0);
      expect(parseBrazilianCurrency(undefined)).toBe(0);
    });

    it('should handle invalid strings', () => {
      expect(parseBrazilianCurrency('invalid')).toBe(0);
      expect(parseBrazilianCurrency('abc')).toBe(0);
    });

    it('should handle empty string', () => {
      expect(parseBrazilianCurrency('')).toBe(0);
    });

    it('should handle strings with only whitespace', () => {
      expect(parseBrazilianCurrency('   ')).toBe(0);
    });

    it('should handle large numbers', () => {
      expect(parseBrazilianCurrency('R$ 1.234.567,89')).toBe(1234567.89);
      expect(parseBrazilianCurrency('10.000,00')).toBe(10000.00);
    });

    it('should handle NaN numbers', () => {
      expect(parseBrazilianCurrency(NaN)).toBe(0);
    });
  });

  describe('parseCurrencyBR', () => {
    it('should parse Brazilian currency strings', () => {
      expect(parseCurrencyBR('R$ 1.234,56')).toBe(1234.56);
      expect(parseCurrencyBR('1.234,56')).toBe(1234.56);
    });

    it('should return 0 for invalid input', () => {
      expect(parseCurrencyBR('invalid')).toBe(0);
    });

    it('should handle non-string inputs', () => {
      expect(parseCurrencyBR(null as any)).toBe(0);
      expect(parseCurrencyBR(undefined as any)).toBe(0);
    });
  });

  describe('formatCurrency', () => {
    it('should format numbers as Brazilian currency', () => {
      expect(formatCurrency(1234.56)).toBe('R$ 1.234,56');
      expect(formatCurrency(6.00)).toBe('R$ 6,00');
      expect(formatCurrency(0)).toBe('R$ 0,00');
    });

    it('should format strings as currency', () => {
      expect(formatCurrency('R$ 1.234,56')).toBe('R$ 1.234,56');
      expect(formatCurrency('6,00')).toBe('R$ 6,00');
    });

    it('should handle null and undefined', () => {
      expect(formatCurrency(null)).toBe('R$ 0,00');
      expect(formatCurrency(undefined)).toBe('R$ 0,00');
    });

    it('should format without symbol when specified', () => {
      expect(formatCurrency(1234.56, { includeSymbol: false })).toBe('1.234,56');
    });

    it('should respect decimal places options', () => {
      expect(formatCurrency(1234.567, { maximumFractionDigits: 3 })).toBe('R$ 1.234,567');
      expect(formatCurrency(1234, { minimumFractionDigits: 0, maximumFractionDigits: 0 })).toBe('R$ 1.234');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with Brazilian separators', () => {
      expect(formatNumber(1234.56)).toBe('1.234,56');
      expect(formatNumber(1234.567, 3)).toBe('1.234,567');
    });

    it('should respect decimal places parameter', () => {
      expect(formatNumber(1234.56, 0)).toBe('1.235');
      expect(formatNumber(1234.56, 1)).toBe('1.234,6');
    });
  });
});

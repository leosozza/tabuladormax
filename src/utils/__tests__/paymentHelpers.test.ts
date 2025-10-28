import { describe, it, expect } from 'vitest';
import { stripTagFromName, parseBrazilianCurrency } from '../paymentHelpers';

describe('paymentHelpers', () => {
  describe('stripTagFromName', () => {
    it('should remove tag prefix from name', () => {
      expect(stripTagFromName('[T448]Loisiane Gomes de Oliveira')).toBe('Loisiane Gomes de Oliveira');
      expect(stripTagFromName('[T123]John Doe')).toBe('John Doe');
      expect(stripTagFromName('[ABC]Test Name')).toBe('Test Name');
    });

    it('should handle names without tags', () => {
      expect(stripTagFromName('John Doe')).toBe('John Doe');
      expect(stripTagFromName('Maria Silva')).toBe('Maria Silva');
    });

    it('should handle multiple tags (only remove first)', () => {
      expect(stripTagFromName('[T1][T2]Name')).toBe('[T2]Name');
    });

    it('should handle tags with spaces', () => {
      expect(stripTagFromName('[T448] Loisiane Gomes')).toBe('Loisiane Gomes');
      expect(stripTagFromName('[T448]  Multiple Spaces')).toBe('Multiple Spaces');
    });

    it('should return undefined for null/undefined', () => {
      expect(stripTagFromName(null)).toBeUndefined();
      expect(stripTagFromName(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(stripTagFromName('')).toBeUndefined();
    });

    it('should handle tag-only string', () => {
      expect(stripTagFromName('[T448]')).toBeUndefined();
      expect(stripTagFromName('[T448] ')).toBeUndefined();
    });
  });

  describe('parseBrazilianCurrency', () => {
    it('should parse currency with R$ symbol', () => {
      expect(parseBrazilianCurrency('R$ 6,00')).toBe(6.00);
      expect(parseBrazilianCurrency('R$6,00')).toBe(6.00);
      expect(parseBrazilianCurrency('R$ 1.234,56')).toBe(1234.56);
    });

    it('should parse currency without symbol', () => {
      expect(parseBrazilianCurrency('6,00')).toBe(6.00);
      expect(parseBrazilianCurrency('1.234,56')).toBe(1234.56);
      expect(parseBrazilianCurrency('123,45')).toBe(123.45);
    });

    it('should handle numbers directly', () => {
      expect(parseBrazilianCurrency(6.0)).toBe(6.0);
      expect(parseBrazilianCurrency(1234.56)).toBe(1234.56);
      expect(parseBrazilianCurrency(0)).toBe(0);
    });

    it('should handle large numbers with thousand separators', () => {
      expect(parseBrazilianCurrency('1.234.567,89')).toBe(1234567.89);
      expect(parseBrazilianCurrency('R$ 10.000,00')).toBe(10000.00);
    });

    it('should return 0 for null/undefined', () => {
      expect(parseBrazilianCurrency(null)).toBe(0);
      expect(parseBrazilianCurrency(undefined)).toBe(0);
    });

    it('should return 0 for invalid strings', () => {
      expect(parseBrazilianCurrency('invalid')).toBe(0);
      expect(parseBrazilianCurrency('abc')).toBe(0);
      expect(parseBrazilianCurrency('')).toBe(0);
    });

    it('should return 0 for NaN', () => {
      expect(parseBrazilianCurrency(NaN)).toBe(0);
    });

    it('should handle integer values without decimals', () => {
      expect(parseBrazilianCurrency('100')).toBe(100);
      expect(parseBrazilianCurrency('R$ 50')).toBe(50);
    });

    it('should handle values with only decimals', () => {
      expect(parseBrazilianCurrency('0,50')).toBe(0.50);
      expect(parseBrazilianCurrency('R$ 0,99')).toBe(0.99);
    });
  });
});

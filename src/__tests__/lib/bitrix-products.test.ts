// Tests for Bitrix Product API functions
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  listProducts, 
  getProduct, 
  getProductPrice,
  BitrixError 
} from '@/lib/bitrix';

// Mock fetch globally
global.fetch = vi.fn();

describe('Bitrix Product API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('listProducts', () => {
    it('should list products successfully', async () => {
      const mockProducts = [
        {
          ID: '1',
          NAME: 'Produto Teste 1',
          PRICE: '100.00',
          CURRENCY_ID: 'BRL',
        },
        {
          ID: '2',
          NAME: 'Produto Teste 2',
          PRICE: '200.00',
          CURRENCY_ID: 'BRL',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: mockProducts }),
      });

      const products = await listProducts();

      expect(products).toHaveLength(2);
      expect(products[0].ID).toBe('1');
      expect(products[0].NAME).toBe('Produto Teste 1');
      expect(typeof products[0].PRICE).toBe('number');
      expect(products[0].PRICE).toBeCloseTo(100, 2);
      expect(products[1].PRICE).toBeCloseTo(200, 2);
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          error: 'ACCESS_DENIED',
          error_description: 'Acesso negado' 
        }),
      });

      await expect(listProducts()).rejects.toThrow(BitrixError);
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
      });

      await expect(listProducts()).rejects.toThrow(BitrixError);
    });

    it('should limit results based on limit parameter', async () => {
      const mockProducts = Array.from({ length: 100 }, (_, i) => ({
        ID: String(i + 1),
        NAME: `Produto ${i + 1}`,
        PRICE: '100.00',
        CURRENCY_ID: 'BRL',
      }));

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: mockProducts }),
      });

      const products = await listProducts({ limit: 10 });
      expect(products).toHaveLength(10);
    });
  });

  describe('getProduct', () => {
    it('should get a single product successfully', async () => {
      const mockProduct = {
        ID: '123',
        NAME: 'Produto Específico',
        PRICE: '299.99',
        CURRENCY_ID: 'BRL',
        DESCRIPTION: 'Descrição do produto',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: mockProduct }),
      });

      const product = await getProduct('123');

      expect(product.ID).toBe('123');
      expect(product.NAME).toBe('Produto Específico');
      expect(typeof product.PRICE).toBe('number');
      expect(product.PRICE).toBeCloseTo(299.99, 2);
      expect(product.DESCRIPTION).toBe('Descrição do produto');
    });

    it('should normalize product data', async () => {
      const mockProduct = {
        ID: '456',
        NAME: 'Produto Sem Preço',
        PRICE: null,
        CURRENCY_ID: null,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: mockProduct }),
      });

      const product = await getProduct('456');

      expect(typeof product.PRICE).toBe('number');
      expect(product.PRICE).toBe(0); // Normalized to 0
      expect(product.CURRENCY_ID).toBe('BRL'); // Default currency
    });

    it('should handle product not found', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          error: 'NOT_FOUND',
          error_description: 'Produto não encontrado' 
        }),
      });

      await expect(getProduct('999')).rejects.toThrow(BitrixError);
    });
  });

  describe('getProductPrice', () => {
    it('should get product price', async () => {
      const mockProduct = {
        ID: '789',
        NAME: 'Produto com Preço',
        PRICE: '599.90',
        CURRENCY_ID: 'BRL',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: mockProduct }),
      });

      const price = await getProductPrice('789');

      expect(price.PRODUCT_ID).toBe('789');
      expect(typeof price.PRICE).toBe('number');
      expect(price.PRICE).toBeCloseTo(599.90, 2);
      expect(price.CURRENCY).toBe('BRL');
    });

    it('should handle errors when fetching price', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
      });

      await expect(getProductPrice('invalid')).rejects.toThrow(BitrixError);
    });
  });

  describe('Product data validation', () => {
    it('should normalize product with missing fields', async () => {
      const mockProduct = {
        ID: '100',
        // Missing NAME
        PRICE: '50.00',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: mockProduct }),
      });

      const product = await getProduct('100');

      expect(product.NAME).toBe('Produto sem nome'); // Default value
      expect(product.CURRENCY_ID).toBe('BRL'); // Default currency
    });

    it('should handle invalid price formats', async () => {
      const mockProduct = {
        ID: '200',
        NAME: 'Produto',
        PRICE: 'invalid-price',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: mockProduct }),
      });

      const product = await getProduct('200');

      expect(typeof product.PRICE).toBe('number');
      expect(product.PRICE).toBe(0); // Invalid price parsed as 0 (NaN becomes 0 with || operator)
    });
  });
});

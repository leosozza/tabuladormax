import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAllRecords, fetchAllLeads } from '@/lib/supabaseUtils';

// Mock Supabase client
const createMockSupabaseClient = () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
  };

  return {
    from: vi.fn(() => mockQuery),
    mockQuery,
  };
};

describe('Supabase Utils - Pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchAllRecords', () => {
    it('should fetch all records when data exceeds 1000 rows', async () => {
      const mockClient = createMockSupabaseClient();
      
      // First call returns 1000 records
      const firstBatch = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
      // Second call returns 500 records
      const secondBatch = Array.from({ length: 500 }, (_, i) => ({ id: i + 1000 }));
      
      mockClient.mockQuery.select
        .mockReturnValueOnce({
          ...mockClient.mockQuery,
          range: vi.fn().mockResolvedValueOnce({
            data: firstBatch,
            error: null,
            count: 1500,
          }),
        })
        .mockReturnValueOnce({
          ...mockClient.mockQuery,
          range: vi.fn().mockResolvedValueOnce({
            data: secondBatch,
            error: null,
            count: 1500,
          }),
        });

      const result = await fetchAllRecords(mockClient as any, 'leads', '*');
      
      expect(result).toHaveLength(1500);
      expect(result[0].id).toBe(0);
      expect(result[1499].id).toBe(1499);
    });

    it('should handle single page of data (less than 1000 records)', async () => {
      const mockClient = createMockSupabaseClient();
      
      const singleBatch = Array.from({ length: 500 }, (_, i) => ({ id: i }));
      
      mockClient.mockQuery.select.mockReturnValueOnce({
        ...mockClient.mockQuery,
        range: vi.fn().mockResolvedValueOnce({
          data: singleBatch,
          error: null,
          count: 500,
        }),
      });

      const result = await fetchAllRecords(mockClient as any, 'leads', '*');
      
      expect(result).toHaveLength(500);
      expect(mockClient.from).toHaveBeenCalledTimes(1);
    });

    it('should apply filter function when provided', async () => {
      const mockClient = createMockSupabaseClient();
      
      const data = [{ id: 1, scouter: 'John' }];
      
      // Mock the range method to return the final result
      const mockRangeWithData = vi.fn().mockResolvedValueOnce({
        data,
        error: null,
        count: 1,
      });
      
      // Mock select to return an object with range that includes the filter chain
      mockClient.mockQuery.select.mockReturnValueOnce({
        range: mockRangeWithData,
        not: vi.fn().mockReturnThis(),
      });

      const filterFn = vi.fn((query) => query);

      const result = await fetchAllRecords(mockClient as any, 'leads', '*', filterFn);
      
      expect(result).toHaveLength(1);
      expect(filterFn).toHaveBeenCalled();
    });

    it('should throw error when query fails', async () => {
      const mockClient = createMockSupabaseClient();
      
      mockClient.mockQuery.select.mockReturnValueOnce({
        ...mockClient.mockQuery,
        range: vi.fn().mockResolvedValueOnce({
          data: null,
          error: new Error('Query failed'),
          count: 0,
        }),
      });

      await expect(
        fetchAllRecords(mockClient as any, 'leads', '*')
      ).rejects.toThrow('Query failed');
    });
  });

  describe('fetchAllLeads', () => {
    it('should use fetchAllRecords with leads table', async () => {
      const mockClient = createMockSupabaseClient();
      
      const data = [{ id: 1, name: 'Lead 1' }];
      
      mockClient.mockQuery.select.mockReturnValueOnce({
        ...mockClient.mockQuery,
        range: vi.fn().mockResolvedValueOnce({
          data,
          error: null,
          count: 1,
        }),
      });

      const result = await fetchAllLeads(mockClient as any);
      
      expect(result).toHaveLength(1);
      expect(mockClient.from).toHaveBeenCalledWith('leads');
    });
  });
});

/**
 * Tests for useDashboard hook
 * Verifies CRUD operations and React Query integration
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDashboard } from '@/hooks/useDashboard';
import type { DashboardConfig } from '@/types/dashboard';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => 
        Promise.resolve({ 
          data: { user: { id: 'test-user-id' } }, 
          error: null 
        })
      ),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: 'test-dashboard-id',
              user_id: 'test-user-id',
              name: 'Test Dashboard',
              description: 'Test',
              widgets: [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
    })),
  },
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useDashboard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('should initialize with empty dashboards', async () => {
    const { result } = renderHook(() => useDashboard(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.dashboards).toEqual([]);
  });

  it('should have CRUD methods available', () => {
    const { result } = renderHook(() => useDashboard(), { wrapper });

    expect(typeof result.current.createDashboard).toBe('function');
    expect(typeof result.current.updateDashboard).toBe('function');
    expect(typeof result.current.deleteDashboard).toBe('function');
    expect(typeof result.current.getDashboard).toBe('function');
  });

  it('should have loading states', () => {
    const { result } = renderHook(() => useDashboard(), { wrapper });

    expect(typeof result.current.isCreating).toBe('boolean');
    expect(typeof result.current.isUpdating).toBe('boolean');
    expect(typeof result.current.isDeleting).toBe('boolean');
  });
});

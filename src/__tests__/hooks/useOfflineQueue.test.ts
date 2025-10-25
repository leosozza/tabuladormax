// ============================================
// Offline Queue Hook Tests
// ============================================
// Unit tests for useOfflineQueue hook

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock modules BEFORE imports
vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(() => true),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ 
        data: { user: { id: 'test-user-id' } }, 
        error: null 
      })),
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

// Mock IndexedDB with factory function
vi.mock('@/lib/offlineQueue', () => ({
  offlineQueueDB: {
    add: vi.fn(),
    getAll: vi.fn(),
    getPending: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    count: vi.fn(),
    countPending: vi.fn(),
    init: vi.fn(),
  },
}));

// Now import after mocks
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { offlineQueueDB } from '@/lib/offlineQueue';

describe('useOfflineQueue', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
    vi.mocked(offlineQueueDB.init).mockResolvedValue(undefined);
    vi.mocked(offlineQueueDB.countPending).mockResolvedValue(0);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('should initialize with zero pending count', async () => {
    const { result } = renderHook(() => useOfflineQueue(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.pendingCount).toBe(0);
    });
  });

  it('should add evaluation to queue', async () => {
    vi.mocked(offlineQueueDB.add).mockResolvedValue('eval-123');
    vi.mocked(offlineQueueDB.countPending).mockResolvedValue(1);

    const { result } = renderHook(() => useOfflineQueue(), { wrapper });
    
    await act(async () => {
      await result.current.addToQueue(1, 'aprovado', 'user-123');
    });

    expect(offlineQueueDB.add).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: 1,
        quality: 'aprovado',
        userId: 'user-123',
        synced: false,
        attempts: 0,
      })
    );

    await waitFor(() => {
      expect(result.current.pendingCount).toBe(1);
    });
  });

  it('should sync pending evaluations when online', async () => {
    const mockEvaluation = {
      id: 'eval-123',
      leadId: 1,
      quality: 'aprovado',
      userId: 'user-123',
      timestamp: new Date().toISOString(),
      synced: false,
      attempts: 0,
    };

    vi.mocked(offlineQueueDB.getPending).mockResolvedValue([mockEvaluation]);
    vi.mocked(offlineQueueDB.update).mockResolvedValue(undefined);
    vi.mocked(offlineQueueDB.delete).mockResolvedValue(undefined);
    vi.mocked(offlineQueueDB.countPending)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);

    const { result } = renderHook(() => useOfflineQueue(), { wrapper });
    
    await act(async () => {
      await result.current.syncPendingEvaluations();
    });

    expect(offlineQueueDB.getPending).toHaveBeenCalled();
    expect(offlineQueueDB.update).toHaveBeenCalled();
    expect(offlineQueueDB.delete).toHaveBeenCalledWith('eval-123');
    
    await waitFor(() => {
      expect(result.current.pendingCount).toBe(0);
      expect(result.current.isSyncing).toBe(false);
    });
  });

  it('should clear queue', async () => {
    vi.mocked(offlineQueueDB.clear).mockResolvedValue(undefined);

    const { result } = renderHook(() => useOfflineQueue(), { wrapper });
    
    await act(async () => {
      await result.current.clearQueue();
    });

    expect(offlineQueueDB.clear).toHaveBeenCalled();
    expect(result.current.pendingCount).toBe(0);
  });

  it('should get pending evaluations', async () => {
    const mockEvaluations = [
      {
        id: 'eval-1',
        leadId: 1,
        quality: 'aprovado',
        userId: 'user-123',
        timestamp: new Date().toISOString(),
        synced: false,
        attempts: 0,
      },
      {
        id: 'eval-2',
        leadId: 2,
        quality: 'rejeitado',
        userId: 'user-123',
        timestamp: new Date().toISOString(),
        synced: false,
        attempts: 0,
      },
    ];

    vi.mocked(offlineQueueDB.getPending).mockResolvedValue(mockEvaluations);

    const { result } = renderHook(() => useOfflineQueue(), { wrapper });
    
    let evaluations;
    await act(async () => {
      evaluations = await result.current.getPendingEvaluations();
    });

    expect(evaluations).toEqual(mockEvaluations);
  });
});

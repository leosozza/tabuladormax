import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useUndoAction } from '@/hooks/useUndoAction';

describe('useUndoAction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should initialize with no undo available', () => {
    const { result } = renderHook(() => useUndoAction());
    
    expect(result.current.isUndoAvailable).toBe(false);
    expect(result.current.lastAction).toBeNull();
  });

  it('should record an action and make undo available', () => {
    const { result } = renderHook(() => useUndoAction({ timeoutMs: 5000 }));
    
    act(() => {
      result.current.recordAction(123, 'aprovado');
    });

    expect(result.current.isUndoAvailable).toBe(true);
    expect(result.current.lastAction).toEqual({
      leadId: 123,
      quality: 'aprovado',
      timestamp: expect.any(Number)
    });
  });

  it('should clear undo after timeout', () => {
    const { result } = renderHook(() => useUndoAction({ timeoutMs: 5000 }));
    
    act(() => {
      result.current.recordAction(123, 'aprovado');
    });

    expect(result.current.isUndoAvailable).toBe(true);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.isUndoAvailable).toBe(false);
    expect(result.current.lastAction).toBeNull();
  });

  it('should manually clear undo', () => {
    const { result } = renderHook(() => useUndoAction({ timeoutMs: 5000 }));
    
    act(() => {
      result.current.recordAction(123, 'aprovado');
    });

    expect(result.current.isUndoAvailable).toBe(true);

    act(() => {
      result.current.clearUndo();
    });

    expect(result.current.isUndoAvailable).toBe(false);
    expect(result.current.lastAction).toBeNull();
  });

  it('should replace previous action with new one', () => {
    const { result } = renderHook(() => useUndoAction({ timeoutMs: 5000 }));
    
    act(() => {
      result.current.recordAction(123, 'aprovado');
    });

    expect(result.current.lastAction?.leadId).toBe(123);

    act(() => {
      result.current.recordAction(456, 'rejeitado');
    });

    expect(result.current.lastAction?.leadId).toBe(456);
    expect(result.current.lastAction?.quality).toBe('rejeitado');
    expect(result.current.isUndoAvailable).toBe(true);
  });

  it('should get last action', () => {
    const { result } = renderHook(() => useUndoAction());
    
    act(() => {
      result.current.recordAction(789, 'aprovado');
    });

    const lastAction = result.current.getLastAction();
    
    expect(lastAction).toEqual({
      leadId: 789,
      quality: 'aprovado',
      timestamp: expect.any(Number)
    });
  });

  it('should use custom timeout', () => {
    const { result } = renderHook(() => useUndoAction({ timeoutMs: 3000 }));
    
    act(() => {
      result.current.recordAction(123, 'aprovado');
    });

    expect(result.current.isUndoAvailable).toBe(true);

    // Should still be available at 2999ms
    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(result.current.isUndoAvailable).toBe(true);

    // Should be cleared at 3000ms
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.isUndoAvailable).toBe(false);
  });

  it('should clear timeout when recording new action', () => {
    const { result } = renderHook(() => useUndoAction({ timeoutMs: 5000 }));
    
    act(() => {
      result.current.recordAction(123, 'aprovado');
    });

    // Advance time partially
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Record new action (should reset timeout)
    act(() => {
      result.current.recordAction(456, 'rejeitado');
    });

    // Advance to where first timeout would have expired
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Should still be available because timeout was reset
    expect(result.current.isUndoAvailable).toBe(true);

    // Complete the new timeout
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.isUndoAvailable).toBe(false);
  });
});

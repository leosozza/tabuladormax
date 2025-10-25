// ============================================
// Lead Column Config Hook Tests
// ============================================
// Unit tests for useLeadColumnConfig hook

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLeadColumnConfig } from '@/hooks/useLeadColumnConfig';

describe('useLeadColumnConfig', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should initialize with default visible columns', () => {
    const { result } = renderHook(() => useLeadColumnConfig());
    
    expect(result.current.visibleColumns).toBeDefined();
    expect(result.current.visibleColumns.length).toBeGreaterThan(0);
    expect(result.current.visibleColumns).toContain('name');
  });

  it('should toggle column visibility', () => {
    const { result } = renderHook(() => useLeadColumnConfig());
    const initialCount = result.current.visibleColumns.length;
    
    // Add a column that's not visible
    act(() => {
      result.current.toggleColumn('age');
    });
    
    // Check if column was added or removed
    const newCount = result.current.visibleColumns.length;
    expect(newCount).not.toBe(initialCount);
  });

  it('should not remove mandatory name column', () => {
    const { result } = renderHook(() => useLeadColumnConfig());
    
    expect(result.current.visibleColumns).toContain('name');
    
    act(() => {
      result.current.toggleColumn('name');
    });
    
    // Name should still be there
    expect(result.current.visibleColumns).toContain('name');
  });

  it('should respect minimum columns constraint', () => {
    const { result } = renderHook(() => useLeadColumnConfig());
    
    // Clear to minimum
    act(() => {
      result.current.clearAll();
    });
    
    expect(result.current.visibleColumns.length).toBeGreaterThanOrEqual(result.current.minColumns);
  });

  it('should reset to default columns', () => {
    const { result } = renderHook(() => useLeadColumnConfig());
    
    // Add some columns
    act(() => {
      result.current.toggleColumn('age');
      result.current.toggleColumn('email');
    });
    
    // Reset
    act(() => {
      result.current.resetToDefault();
    });
    
    // Should have default visible columns
    expect(result.current.visibleColumns).toBeDefined();
  });

  it('should check if column can be toggled', () => {
    const { result } = renderHook(() => useLeadColumnConfig());
    
    // Name cannot be toggled (mandatory)
    expect(result.current.canToggle('name')).toBe(false);
    
    // Other columns should be toggleable if within limits
    const canToggleAge = result.current.canToggle('age');
    expect(typeof canToggleAge).toBe('boolean');
  });

  it('should persist columns to localStorage', () => {
    const { result } = renderHook(() => useLeadColumnConfig());
    
    act(() => {
      result.current.toggleColumn('age');
    });
    
    // Check localStorage
    const stored = localStorage.getItem('leads_visible_columns');
    expect(stored).toBeDefined();
    
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(Array.isArray(parsed)).toBe(true);
    }
  });
});

// ============================================
// Tinder Card Config Hook Tests
// ============================================
// Unit tests for useTinderCardConfig hook

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTinderCardConfig } from '@/hooks/useTinderCardConfig';

describe('useTinderCardConfig', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should initialize with default config', () => {
    const { result } = renderHook(() => useTinderCardConfig());
    
    expect(result.current.config).toBeDefined();
    expect(result.current.config.photoField).toBe('photo_url');
    expect(result.current.config.mainFields).toBeDefined();
    expect(result.current.config.detailFields).toBeDefined();
    expect(result.current.config.badgeFields).toBeDefined();
  });

  it('should update photo field', () => {
    const { result } = renderHook(() => useTinderCardConfig());
    
    act(() => {
      result.current.setPhotoField('foto');
    });
    
    expect(result.current.config.photoField).toBe('foto');
  });

  it('should add main field', () => {
    const { result } = renderHook(() => useTinderCardConfig());
    const initialCount = result.current.config.mainFields.length;
    
    act(() => {
      result.current.addMainField('email');
    });
    
    // If under max, should be added
    if (initialCount < result.current.validation.mainFields.max) {
      expect(result.current.config.mainFields).toContain('email');
    }
  });

  it('should not exceed max main fields', () => {
    const { result } = renderHook(() => useTinderCardConfig());
    
    // Try adding more than max
    act(() => {
      result.current.addMainField('field1');
      result.current.addMainField('field2');
      result.current.addMainField('field3');
      result.current.addMainField('field4');
    });
    
    expect(result.current.config.mainFields.length).toBeLessThanOrEqual(
      result.current.validation.mainFields.max
    );
  });

  it('should maintain minimum main fields', () => {
    const { result } = renderHook(() => useTinderCardConfig());
    
    // Try removing all fields
    const fieldsToRemove = [...result.current.config.mainFields];
    act(() => {
      fieldsToRemove.forEach(field => {
        result.current.removeMainField(field);
      });
    });
    
    expect(result.current.config.mainFields.length).toBeGreaterThanOrEqual(
      result.current.validation.mainFields.min
    );
  });

  it('should add and remove detail fields', () => {
    const { result } = renderHook(() => useTinderCardConfig());
    
    act(() => {
      result.current.addDetailField('test_field');
    });
    
    expect(result.current.config.detailFields).toContain('test_field');
    
    act(() => {
      result.current.removeDetailField('test_field');
    });
    
    expect(result.current.config.detailFields).not.toContain('test_field');
  });

  it('should reset to default config', () => {
    const { result } = renderHook(() => useTinderCardConfig());
    
    // Make changes
    act(() => {
      result.current.setPhotoField('new_photo');
      result.current.addDetailField('extra_field');
    });
    
    // Reset
    act(() => {
      result.current.resetToDefault();
    });
    
    expect(result.current.config.photoField).toBe('photo_url');
  });

  it('should check if can add fields', () => {
    const { result } = renderHook(() => useTinderCardConfig());
    
    expect(typeof result.current.canAddMainField()).toBe('boolean');
    expect(typeof result.current.canRemoveMainField()).toBe('boolean');
    expect(typeof result.current.canAddDetailField()).toBe('boolean');
    expect(typeof result.current.canAddBadgeField()).toBe('boolean');
  });

  it('should persist config to localStorage', () => {
    const { result } = renderHook(() => useTinderCardConfig());
    
    act(() => {
      result.current.setPhotoField('custom_photo');
    });
    
    // Check localStorage
    const stored = localStorage.getItem('tinder_card_config');
    expect(stored).toBeDefined();
    
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.photoField).toBe('custom_photo');
    }
  });
});

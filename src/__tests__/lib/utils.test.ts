// ============================================
// Utils Tests
// ============================================
// Unit tests for utility functions

import { describe, it, expect } from 'vitest';
import { isValidUUID } from '@/lib/utils';

describe('isValidUUID', () => {
  it('should return true for valid UUID v4', () => {
    const validUUIDs = [
      '550e8400-e29b-41d4-a716-446655440000',
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      '123e4567-e89b-12d3-a456-426614174000',
    ];

    validUUIDs.forEach(uuid => {
      expect(isValidUUID(uuid)).toBe(true);
    });
  });

  it('should return false for invalid UUIDs', () => {
    const invalidUUIDs = [
      'not-a-uuid',
      '123',
      '',
      'John Doe',
      'admin@example.com',
      '550e8400-e29b-41d4-a716',
      '550e8400-e29b-41d4-a716-446655440000-extra',
      'g50e8400-e29b-41d4-a716-446655440000', // invalid character 'g'
    ];

    invalidUUIDs.forEach(uuid => {
      expect(isValidUUID(uuid)).toBe(false);
    });
  });

  it('should handle uppercase UUIDs', () => {
    expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('should handle mixed case UUIDs', () => {
    expect(isValidUUID('550e8400-E29B-41d4-A716-446655440000')).toBe(true);
  });
});

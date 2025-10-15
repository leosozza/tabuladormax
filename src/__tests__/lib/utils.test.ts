// ============================================
// Utils Tests
// ============================================
// Unit tests for utility functions

import { describe, it, expect } from 'vitest';
import { isValidUUID, generateFixResponsibleSQL } from '@/lib/utils';

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

describe('generateFixResponsibleSQL', () => {
  it('should generate SQL for fixing invalid responsibles', () => {
    const invalidResponsibles = ['João Silva', 'Maria Santos', 'Pedro Costa'];
    const sql = generateFixResponsibleSQL(invalidResponsibles);
    
    expect(sql).toContain('SELECT id, name, responsible');
    expect(sql).toContain('FROM leads');
    expect(sql).toContain('SELECT id, display_name, email');
    expect(sql).toContain('FROM profiles');
    expect(sql).toContain("WHERE responsible = 'João Silva'");
    expect(sql).toContain("WHERE responsible = 'Maria Santos'");
    expect(sql).toContain("WHERE responsible = 'Pedro Costa'");
    expect(sql).toContain('UPDATE leads SET responsible');
  });

  it('should handle empty array', () => {
    const sql = generateFixResponsibleSQL([]);
    expect(sql).toContain('Nenhum responsável inválido encontrado');
  });

  it('should escape single quotes in responsible names', () => {
    const invalidResponsibles = ["O'Brien", "D'Angelo"];
    const sql = generateFixResponsibleSQL(invalidResponsibles);
    
    expect(sql).toContain("WHERE responsible = 'O''Brien'");
    expect(sql).toContain("WHERE responsible = 'D''Angelo'");
  });

  it('should include all SQL steps', () => {
    const invalidResponsibles = ['Test User'];
    const sql = generateFixResponsibleSQL(invalidResponsibles);
    
    expect(sql).toContain('Passo 1:');
    expect(sql).toContain('Passo 2:');
    expect(sql).toContain('Passo 3:');
    expect(sql).toContain('Passo 4:');
    expect(sql).toContain('Passo 5:');
  });
});

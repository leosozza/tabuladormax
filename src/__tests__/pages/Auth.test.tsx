import { describe, it, expect, beforeEach, vi } from 'vitest';

// Unit tests for telemarketing validation logic
describe('Telemarketing Validation Logic', () => {
  describe('telemarketingId validation', () => {
    const isValidTelemarketingId = (id: any): boolean => {
      return id != null && Number.isInteger(id) && id > 0;
    };

    it('should reject null or undefined', () => {
      expect(isValidTelemarketingId(null)).toBe(false);
      expect(isValidTelemarketingId(undefined)).toBe(false);
    });

    it('should reject 0', () => {
      expect(isValidTelemarketingId(0)).toBe(false);
    });

    it('should reject negative numbers', () => {
      expect(isValidTelemarketingId(-1)).toBe(false);
      expect(isValidTelemarketingId(-100)).toBe(false);
    });

    it('should reject non-integers', () => {
      expect(isValidTelemarketingId(1.5)).toBe(false);
      expect(isValidTelemarketingId(3.14)).toBe(false);
    });

    it('should reject non-numeric values', () => {
      expect(isValidTelemarketingId('123')).toBe(false);
      expect(isValidTelemarketingId(NaN)).toBe(false);
    });

    it('should accept valid positive integers', () => {
      expect(isValidTelemarketingId(1)).toBe(true);
      expect(isValidTelemarketingId(123)).toBe(true);
      expect(isValidTelemarketingId(999999)).toBe(true);
    });
  });

  describe('createAgentMapping error code handling', () => {
    const getErrorMessage = (errorCode: string): string => {
      if (errorCode === '42501') {
        return 'Erro de permissão: Você não tem permissão para criar o mapeamento. Contate o administrador.';
      } else if (errorCode === '23503') {
        return 'Erro: Referência inválida. Verifique se o usuário existe.';
      } else if (errorCode === '23505') {
        return 'Duplicate - mapping already exists';
      } else {
        return `Erro ao criar mapeamento de agente: ${errorCode}`;
      }
    };

    it('should return permission error for code 42501', () => {
      const message = getErrorMessage('42501');
      expect(message).toContain('permissão');
      expect(message).toContain('administrador');
    });

    it('should return reference error for code 23503', () => {
      const message = getErrorMessage('23503');
      expect(message).toContain('Referência inválida');
    });

    it('should handle duplicate constraint for code 23505', () => {
      const message = getErrorMessage('23505');
      expect(message).toContain('Duplicate');
    });

    it('should return generic error for unknown codes', () => {
      const message = getErrorMessage('UNKNOWN');
      expect(message).toContain('Erro ao criar mapeamento');
      expect(message).toContain('UNKNOWN');
    });
  });

  describe('User metadata validation', () => {
    const hasValidTelemarketingMetadata = (user: any): boolean => {
      const tmId = user?.user_metadata?.telemarketing_id;
      return Number.isInteger(tmId) && tmId > 0;
    };

    it('should return false for user without metadata', () => {
      expect(hasValidTelemarketingMetadata({})).toBe(false);
      expect(hasValidTelemarketingMetadata({ user_metadata: {} })).toBe(false);
    });

    it('should return false for invalid telemarketing_id in metadata', () => {
      expect(hasValidTelemarketingMetadata({ user_metadata: { telemarketing_id: null } })).toBe(false);
      expect(hasValidTelemarketingMetadata({ user_metadata: { telemarketing_id: 0 } })).toBe(false);
      expect(hasValidTelemarketingMetadata({ user_metadata: { telemarketing_id: -1 } })).toBe(false);
      expect(hasValidTelemarketingMetadata({ user_metadata: { telemarketing_id: 'invalid' } })).toBe(false);
    });

    it('should return true for valid telemarketing_id in metadata', () => {
      expect(hasValidTelemarketingMetadata({ user_metadata: { telemarketing_id: 1 } })).toBe(true);
      expect(hasValidTelemarketingMetadata({ user_metadata: { telemarketing_id: 123 } })).toBe(true);
      expect(hasValidTelemarketingMetadata({ user_metadata: { telemarketing_id: 999 } })).toBe(true);
    });
  });

  describe('Mapping creation validation', () => {
    const validateMappingParams = (userId: string | null | undefined, tmId: number | null | undefined): { valid: boolean; error?: string } => {
      if (!userId) {
        return { valid: false, error: 'userId is required' };
      }
      if (!tmId || !Number.isInteger(tmId) || tmId <= 0) {
        return { valid: false, error: 'Invalid telemarketing ID' };
      }
      return { valid: true };
    };

    it('should reject missing userId', () => {
      const result = validateMappingParams(null, 123);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('userId');
    });

    it('should reject invalid telemarketing ID', () => {
      const result1 = validateMappingParams('user-123', null);
      expect(result1.valid).toBe(false);
      expect(result1.error).toContain('Invalid telemarketing');

      const result2 = validateMappingParams('user-123', 0);
      expect(result2.valid).toBe(false);

      const result3 = validateMappingParams('user-123', -1);
      expect(result3.valid).toBe(false);
    });

    it('should accept valid parameters', () => {
      const result = validateMappingParams('user-123', 456);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });
});


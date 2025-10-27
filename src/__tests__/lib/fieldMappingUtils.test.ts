import { describe, it, expect } from 'vitest';
import {
  createBitrixToSupabaseMapping,
  createSupabaseToBitrixMapping,
  formatFieldMappingsForDisplay,
  getFieldMappingSummary,
  groupFieldMappingsByDirection,
  SyncFieldMappings,
} from '@/lib/fieldMappingUtils';

describe('Field Mapping Utils', () => {
  describe('createBitrixToSupabaseMapping', () => {
    it('should create a mapping without transformation', () => {
      const mapping = createBitrixToSupabaseMapping('NAME', 'name', 'John Doe');
      
      expect(mapping).toEqual({
        bitrix_field: 'NAME',
        tabuladormax_field: 'name',
        value: 'John Doe',
        transformed: false,
        transform_function: undefined,
        priority: undefined,
      });
    });

    it('should create a mapping with transformation', () => {
      const mapping = createBitrixToSupabaseMapping(
        'UF_IDADE',
        'age',
        '25',
        'toNumber',
        1
      );
      
      expect(mapping).toEqual({
        bitrix_field: 'UF_IDADE',
        tabuladormax_field: 'age',
        value: '25',
        transformed: true,
        transform_function: 'toNumber',
        priority: 1,
      });
    });
  });

  describe('createSupabaseToBitrixMapping', () => {
    it('should create a mapping', () => {
      const mapping = createSupabaseToBitrixMapping('name', 'NAME', 'Jane Doe');
      
      expect(mapping).toEqual({
        bitrix_field: 'NAME',
        tabuladormax_field: 'name',
        value: 'Jane Doe',
        transformed: false,
      });
    });
  });

  describe('formatFieldMappingsForDisplay', () => {
    it('should format bitrix to supabase mappings', () => {
      const mappings: SyncFieldMappings = {
        bitrix_to_supabase: [
          {
            bitrix_field: 'NAME',
            tabuladormax_field: 'name',
            value: 'John Doe',
            transformed: false,
          },
          {
            bitrix_field: 'UF_IDADE',
            tabuladormax_field: 'age',
            value: 25,
            transformed: true,
          },
        ],
      };

      const formatted = formatFieldMappingsForDisplay(mappings);

      expect(formatted).toHaveLength(2);
      expect(formatted[0]).toEqual({
        direction: 'Bitrix → Supabase',
        from: 'NAME',
        to: 'name',
        value: 'John Doe',
        transformed: false,
      });
      expect(formatted[1]).toEqual({
        direction: 'Bitrix → Supabase',
        from: 'UF_IDADE',
        to: 'age',
        value: '25',
        transformed: true,
      });
    });

    it('should format supabase to bitrix mappings', () => {
      const mappings: SyncFieldMappings = {
        supabase_to_bitrix: [
          {
            bitrix_field: 'NAME',
            tabuladormax_field: 'name',
            value: 'Jane Doe',
            transformed: false,
          },
        ],
      };

      const formatted = formatFieldMappingsForDisplay(mappings);

      expect(formatted).toHaveLength(1);
      expect(formatted[0]).toEqual({
        direction: 'Supabase → Bitrix',
        from: 'name',
        to: 'NAME',
        value: 'Jane Doe',
        transformed: false,
      });
    });

    it('should handle empty values', () => {
      const mappings: SyncFieldMappings = {
        bitrix_to_supabase: [
          {
            bitrix_field: 'NAME',
            tabuladormax_field: 'name',
            value: null,
            transformed: false,
          },
        ],
      };

      const formatted = formatFieldMappingsForDisplay(mappings);

      expect(formatted[0].value).toBe('(vazio)');
    });

    it('should truncate long values', () => {
      const longValue = 'a'.repeat(100);
      const mappings: SyncFieldMappings = {
        bitrix_to_supabase: [
          {
            bitrix_field: 'DESCRIPTION',
            tabuladormax_field: 'description',
            value: longValue,
            transformed: false,
          },
        ],
      };

      const formatted = formatFieldMappingsForDisplay(mappings);

      expect(formatted[0].value).toHaveLength(50); // 47 + '...'
      expect(formatted[0].value).toContain('...');
    });
  });

  describe('getFieldMappingSummary', () => {
    it('should calculate summary correctly', () => {
      const mappings: SyncFieldMappings = {
        bitrix_to_supabase: [
          {
            bitrix_field: 'NAME',
            tabuladormax_field: 'name',
            value: 'John',
            transformed: false,
          },
          {
            bitrix_field: 'UF_IDADE',
            tabuladormax_field: 'age',
            value: 25,
            transformed: true,
          },
        ],
        supabase_to_bitrix: [
          {
            bitrix_field: 'UF_SCOUTER',
            tabuladormax_field: 'scouter',
            value: 'Agent 1',
            transformed: false,
          },
        ],
      };

      const summary = getFieldMappingSummary(mappings);

      expect(summary).toEqual({
        totalFields: 3,
        transformedFields: 1,
        bitrixToSupabaseCount: 2,
        supabaseToBitrixCount: 1,
      });
    });

    it('should handle empty mappings', () => {
      const mappings: SyncFieldMappings = {};

      const summary = getFieldMappingSummary(mappings);

      expect(summary).toEqual({
        totalFields: 0,
        transformedFields: 0,
        bitrixToSupabaseCount: 0,
        supabaseToBitrixCount: 0,
      });
    });
  });

  describe('groupFieldMappingsByDirection', () => {
    it('should group mappings by direction', () => {
      const mappings: SyncFieldMappings = {
        bitrix_to_supabase: [
          {
            bitrix_field: 'NAME',
            tabuladormax_field: 'name',
            value: 'John',
            transformed: false,
          },
        ],
        supabase_to_bitrix: [
          {
            bitrix_field: 'UF_SCOUTER',
            tabuladormax_field: 'scouter',
            value: 'Agent 1',
            transformed: false,
          },
        ],
      };

      const groups = groupFieldMappingsByDirection(mappings);

      expect(groups).toHaveLength(2);
      expect(groups[0].direction).toBe('Bitrix → Supabase');
      expect(groups[0].mappings).toHaveLength(1);
      expect(groups[1].direction).toBe('Supabase → Bitrix');
      expect(groups[1].mappings).toHaveLength(1);
    });

    it('should handle single direction', () => {
      const mappings: SyncFieldMappings = {
        bitrix_to_supabase: [
          {
            bitrix_field: 'NAME',
            tabuladormax_field: 'name',
            value: 'John',
            transformed: false,
          },
        ],
      };

      const groups = groupFieldMappingsByDirection(mappings);

      expect(groups).toHaveLength(1);
      expect(groups[0].direction).toBe('Bitrix → Supabase');
    });

    it('should handle empty mappings', () => {
      const mappings: SyncFieldMappings = {};

      const groups = groupFieldMappingsByDirection(mappings);

      expect(groups).toHaveLength(0);
    });
  });
});

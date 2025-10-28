/**
 * Field Mapping Utilities
 * 
 * Utilities for tracking and visualizing field mappings during sync operations
 * between Bitrix and Supabase.
 */

export interface FieldMapping {
  bitrix_field: string;
  tabuladormax_field: string;
  value: unknown;
  transformed: boolean;
  transform_function?: string;
  priority?: number;
}

export interface SyncFieldMappings {
  bitrix_to_supabase?: FieldMapping[];
  supabase_to_bitrix?: FieldMapping[];
}

/**
 * Creates a field mapping record for Bitrix to Supabase sync
 */
export function createBitrixToSupabaseMapping(
  bitrixField: string,
  tabuladorMaxField: string,
  value: unknown,
  transformFunction?: string,
  priority?: number
): FieldMapping {
  return {
    bitrix_field: bitrixField,
    tabuladormax_field: tabuladorMaxField,
    value: value,
    transformed: !!transformFunction,
    transform_function: transformFunction,
    priority: priority,
  };
}

/**
 * Creates a field mapping record for Supabase to Bitrix sync
 */
export function createSupabaseToBitrixMapping(
  tabuladorMaxField: string,
  bitrixField: string,
  value: unknown
): FieldMapping {
  return {
    bitrix_field: bitrixField,
    tabuladormax_field: tabuladorMaxField,
    value: value,
    transformed: false,
  };
}

/**
 * Formats field mappings for display in UI
 */
export function formatFieldMappingsForDisplay(mappings: SyncFieldMappings): {
  direction: string;
  from: string;
  to: string;
  value: string;
  transformed: boolean;
}[] {
  const formatted: {
    direction: string;
    from: string;
    to: string;
    value: string;
    transformed: boolean;
  }[] = [];

  if (mappings.bitrix_to_supabase) {
    mappings.bitrix_to_supabase.forEach((mapping) => {
      formatted.push({
        direction: 'Bitrix → Supabase',
        from: mapping.bitrix_field,
        to: mapping.tabuladormax_field,
        value: formatValue(mapping.value),
        transformed: mapping.transformed,
      });
    });
  }

  if (mappings.supabase_to_bitrix) {
    mappings.supabase_to_bitrix.forEach((mapping) => {
      formatted.push({
        direction: 'Supabase → Bitrix',
        from: mapping.tabuladormax_field,
        to: mapping.bitrix_field,
        value: formatValue(mapping.value),
        transformed: mapping.transformed,
      });
    });
  }

  return formatted;
}

/**
 * Formats a value for display, handling different types
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '(vazio)';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  if (typeof value === 'string' && value.length > 50) {
    return value.substring(0, 47) + '...';
  }
  return String(value);
}

/**
 * Gets a summary of field mappings
 */
export function getFieldMappingSummary(mappings: SyncFieldMappings): {
  totalFields: number;
  transformedFields: number;
  bitrixToSupabaseCount: number;
  supabaseToBitrixCount: number;
} {
  const bitrixToSupabaseCount = mappings.bitrix_to_supabase?.length || 0;
  const supabaseToBitrixCount = mappings.supabase_to_bitrix?.length || 0;
  const totalFields = bitrixToSupabaseCount + supabaseToBitrixCount;
  
  const transformedFields = [
    ...(mappings.bitrix_to_supabase || []),
    ...(mappings.supabase_to_bitrix || []),
  ].filter((m) => m.transformed).length;

  return {
    totalFields,
    transformedFields,
    bitrixToSupabaseCount,
    supabaseToBitrixCount,
  };
}

/**
 * Groups field mappings by direction
 */
export function groupFieldMappingsByDirection(
  mappings: SyncFieldMappings
): { direction: string; mappings: FieldMapping[] }[] {
  const groups: { direction: string; mappings: FieldMapping[] }[] = [];

  if (mappings.bitrix_to_supabase && mappings.bitrix_to_supabase.length > 0) {
    groups.push({
      direction: 'Bitrix → Supabase',
      mappings: mappings.bitrix_to_supabase,
    });
  }

  if (mappings.supabase_to_bitrix && mappings.supabase_to_bitrix.length > 0) {
    groups.push({
      direction: 'Supabase → Bitrix',
      mappings: mappings.supabase_to_bitrix,
    });
  }

  return groups;
}

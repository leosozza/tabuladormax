import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FieldFilterConfig {
  type: 'enum' | 'boolean' | 'text' | 'number' | 'date';
  options?: Array<{ value: string; label: string }>;
  bitrixField?: string;
  bitrixFieldType?: string;
}

export function useFieldFilterOptions(supabaseField: string): FieldFilterConfig | null {
  // 1. Buscar field_mapping do campo
  const { data: mapping } = useQuery({
    queryKey: ['field-mapping', supabaseField],
    queryFn: async () => {
      if (!supabaseField) return null;
      
      const { data } = await supabase
        .from('field_mappings')
        .select('bitrix_field, bitrix_field_type, field_type, supabase_field_type')
        .eq('supabase_field', supabaseField)
        .eq('active', true)
        .maybeSingle();
      
      return data;
    },
    enabled: !!supabaseField,
  });

  // 2. Se for campo booleano, retornar opções Sim/Não
  if (mapping?.field_type === 'boolean' || mapping?.supabase_field_type === 'boolean') {
    return {
      type: 'boolean',
      options: [
        { value: 'true', label: 'Sim' },
        { value: 'false', label: 'Não' }
      ]
    };
  }

  // 3. Se for enum do Bitrix, buscar opções do cache
  const { data: cache } = useQuery({
    queryKey: ['bitrix-field-cache', mapping?.bitrix_field],
    queryFn: async () => {
      if (!mapping?.bitrix_field) return null;
      
      const { data } = await supabase
        .from('bitrix_fields_cache')
        .select('list_items')
        .eq('field_id', mapping.bitrix_field)
        .maybeSingle();
      
      return data;
    },
    enabled: !!mapping?.bitrix_field && ['crm_status', 'enumeration'].includes(mapping?.bitrix_field_type || ''),
  });

  if (cache?.list_items && Array.isArray(cache.list_items)) {
    return {
      type: 'enum',
      options: cache.list_items.map((item: any) => ({
        value: item.ID,
        label: item.VALUE
      })),
      bitrixField: mapping?.bitrix_field,
      bitrixFieldType: mapping?.bitrix_field_type
    };
  }

  // 4. Para campos numéricos
  if (mapping?.field_type === 'number' || mapping?.field_type === 'integer' || 
      mapping?.supabase_field_type === 'integer' || mapping?.supabase_field_type === 'numeric') {
    return { type: 'number' };
  }

  // 5. Para campos de data
  if (mapping?.field_type === 'date' || mapping?.field_type === 'datetime' ||
      mapping?.supabase_field_type?.includes('timestamp')) {
    return { type: 'date' };
  }

  // 6. Padrão: texto
  return { type: 'text' };
}

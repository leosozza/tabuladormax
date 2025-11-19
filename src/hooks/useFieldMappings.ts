import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FieldMapping {
  id: string;
  bitrix_field: string | null;
  bitrix_field_type: string | null;
  bitrix_display_name: string | null;
  supabase_field: string;
  supabase_field_type: string | null;
  display_name: string;
  category: string;
  field_type: string;
  transform_function: string | null;
  formatter_function: string | null;
  default_visible: boolean;
  sortable: boolean;
  priority: number;
  active: boolean;
  notes: string | null;
}

/**
 * Hook unificado para buscar mapeamentos de campos
 * Substitui useGestaoFieldMappings e funciona para toda a plataforma
 */
export const useFieldMappings = (activeOnly: boolean = true) => {
  return useQuery({
    queryKey: ['field-mappings', activeOnly],
    queryFn: async () => {
      let query = supabase
        .from('field_mappings')
        .select('*')
        .order('priority');
      
      if (activeOnly) {
        query = query.eq('active', true);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data as FieldMapping[];
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });
};

/**
 * Hook para buscar apenas mapeamentos com Bitrix configurado
 * Útil para sincronizações
 */
export const useBitrixMappings = () => {
  return useQuery({
    queryKey: ['field-mappings-bitrix'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('field_mappings')
        .select('*')
        .eq('active', true)
        .not('bitrix_field', 'is', null)
        .order('priority');
      
      if (error) throw error;
      
      return data as FieldMapping[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook para buscar mapeamentos de exibição (Gestão Scouter)
 * Retorna apenas campos visíveis por padrão
 */
export const useDisplayMappings = () => {
  return useQuery({
    queryKey: ['field-mappings-display'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('field_mappings')
        .select('*')
        .eq('active', true)
        .eq('default_visible', true)
        .order('priority');
      
      if (error) throw error;
      
      return data as FieldMapping[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { detectMissingFields } from '@/utils/fieldValidator';

interface SupabaseDataResult<T> {
  data: T[];
  missingFields: string[];
}

interface UseSupabaseDataOptions {
  table: string;
  select?: string;
  filters?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  enabled?: boolean;
  staleTime?: number;
}

/**
 * Hook unificado para buscar dados do Supabase com detecção de campos ausentes
 * 
 * ⚠️ IMPORTANTE: Para leads, sempre use a tabela 'leads' como fonte única
 */
export function useSupabaseData<T = any>(
  options: UseSupabaseDataOptions
): {
  data: T[];
  missingFields: string[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const {
    table,
    select = '*',
    filters,
    orderBy,
    limit,
    enabled = true,
    staleTime = 30000
  } = options;

  const query = useQuery({
    queryKey: ['supabase-data', table, select, filters, orderBy, limit],
    queryFn: async (): Promise<SupabaseDataResult<T>> => {
      console.log(`🔍 [useSupabaseData] Consultando tabela: "${table}"`);
      
      // Use any para evitar problemas de tipo com tabelas dinâmicas
      let queryBuilder = supabase.from(table as any).select(select);

      // Aplicar filtros dinamicamente
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
              queryBuilder = queryBuilder.in(key, value);
            } else {
              queryBuilder = queryBuilder.eq(key, value);
            }
          }
        });
      }

      // Ordenação com fallback seguro
      if (orderBy) {
        queryBuilder = queryBuilder.order(orderBy.column, { ascending: orderBy.ascending ?? false });
      }

      // Limite
      if (limit) {
        queryBuilder = queryBuilder.limit(limit);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error(`❌ [useSupabaseData] Erro ao buscar dados de ${table}:`, error);
        throw error;
      }

      console.log(`✅ [useSupabaseData] ${data?.length || 0} registros retornados de "${table}"`);

      // Detectar campos ausentes apenas para tabelas validadas
      let missingFields: string[] = [];
      if (table === 'leads' || table === 'scouter_profiles') {
        missingFields = detectMissingFields(data || [], table);
      }

      return {
        data: (data || []) as T[],
        missingFields
      };
    },
    enabled,
    staleTime
  });

  return {
    data: query.data?.data || [],
    missingFields: query.data?.missingFields || [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch
  };
}

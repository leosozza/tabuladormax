import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-helper';
import { fichaMapper } from '@/services/fieldMappingService';
import type { LeadDataPoint } from '@/types/lead';

interface UseLeadsParams {
  startDate?: string;
  endDate?: string;
  projeto?: string;
  scouter?: string;
  withGeo?: boolean;
}

export function useLeads(params: UseLeadsParams = {}) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: async (): Promise<LeadDataPoint[]> => {
      // ⚠️ IMPORTANTE: Sempre usar a tabela 'leads' como fonte única de verdade
      // A tabela 'fichas' foi migrada para 'leads' (LEGADO/DEPRECATED)
      let query = supabase
        .from('leads')
        .select('*')
        .or('deleted.is.false,deleted.is.null');

      // Apply date filters usando 'criado' (date field)
      if (params.startDate) {
        query = query.gte('criado', params.startDate);
      }
      if (params.endDate) {
        query = query.lte('criado', params.endDate);
      }
      if (params.projeto) {
        query = query.eq('projeto', params.projeto);
      }
      if (params.scouter) {
        query = query.ilike('scouter', `%${params.scouter}%`);
      }
      if (params.withGeo) {
        query = query.not('latitude', 'is', null).not('longitude', 'is', null);
      }

      // Execute query - ordenar por 'criado'
      const { data, error } = await query.order('criado', { ascending: false });

      if (error) {
        console.error('[useLeads] Erro ao buscar leads:', error);
        throw error;
      }

      return (data || []).map((row) => fichaMapper.normalizeFichaGeo(row));
    },
    staleTime: 30000,
  });
}
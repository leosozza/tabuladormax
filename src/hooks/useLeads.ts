import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseLeadsParams {
  startDate?: string;
  endDate?: string;
  projeto?: string;
  scouter?: string;
  etapa?: string;
  withGeo?: boolean;
}

export function useLeads(params: UseLeadsParams = {}) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('*')
        .order('criado', { ascending: false });

      // Apply date filters using 'criado' (date field)
      if (params.startDate) {
        query = query.gte('criado', params.startDate);
      }
      if (params.endDate) {
        query = query.lte('criado', params.endDate);
      }
      if (params.projeto) {
        query = query.eq('projetos', params.projeto);
      }
      if (params.scouter) {
        query = query.ilike('scouter', `%${params.scouter}%`);
      }
      if (params.etapa) {
        query = query.eq('etapa', params.etapa);
      }
      if (params.withGeo) {
        query = query.not('latitude', 'is', null).not('longitude', 'is', null);
      }

      // Execute query
      const { data, error } = await query;

      if (error) {
        console.error('[useLeads] Erro ao buscar leads:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 30000,
  });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { performanceMonitor } from '@/lib/monitoring';

interface UseLeadsParams {
  startDate?: string;
  endDate?: string;
  projeto?: string;
  scouter?: string;
  etapa?: string;
  withGeo?: boolean;
}

export function useLeads(params: UseLeadsParams = {}) {
  const queryKey = ['leads', params];
  const startTime = performance.now();

  return useQuery({
    queryKey,
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
        
        // Record error metric
        performanceMonitor.recordQueryPerformance({
          queryKey: JSON.stringify(queryKey),
          value: performance.now() - startTime,
          status: 'error',
          metadata: {
            errorMessage: error.message,
            errorCode: error.code,
          },
        });
        
        throw error;
      }

      // Record success metric
      const duration = performance.now() - startTime;
      const dataSize = data ? JSON.stringify(data).length : 0;
      
      performanceMonitor.recordQueryPerformance({
        queryKey: JSON.stringify(queryKey),
        value: duration,
        status: 'success',
        dataSize,
        metadata: {
          recordCount: data?.length || 0,
          hasFilters: Object.keys(params).length > 0,
        },
      });

      return data || [];
    },
    staleTime: 30000,
  });
}

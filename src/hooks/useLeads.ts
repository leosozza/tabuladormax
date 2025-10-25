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
  columns?: string[]; // Dynamic column selection
  page?: number; // Pagination support
  pageSize?: number; // Page size for pagination
}

const DEFAULT_PAGE_SIZE = 50;

export function useLeads(params: UseLeadsParams = {}) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const columns = params.columns?.join(',') || '*';
  
  const queryKey = ['leads', params];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const startTime = performance.now();
      
      // Calculate pagination offset
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('leads')
        .select(columns, { count: 'exact' })
        .order('criado', { ascending: false })
        .range(from, to);

      // Apply date filters using 'criado' (date field)
      if (params.startDate) {
        query = query.gte('criado', params.startDate);
      }
      if (params.endDate) {
        query = query.lte('criado', params.endDate);
      }
      if (params.projeto) {
        (query as any) = (query as any).eq('projetos', params.projeto);
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
      const { data, error, count } = await query;

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

      // Record successful query performance
      performanceMonitor.recordQueryPerformance({
        queryKey: JSON.stringify(queryKey),
        value: performance.now() - startTime,
        status: 'success',
        metadata: {
          resultCount: data?.length || 0,
        },
      });

      return {
        data: data || [], 
        count: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    },
    staleTime: 30000,
  });
}

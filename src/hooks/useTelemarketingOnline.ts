import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TelemarketingOnline {
  id: string;
  name: string;
  bitrix_id: number;
  last_activity_at: string;
  cargo: string | null;
}

const ONLINE_THRESHOLD_HOURS = 4; // Considera ativo se logou nas últimas 4 horas
const ONLINE_THRESHOLD_MINUTES = ONLINE_THRESHOLD_HOURS * 60; // 240 minutos

/**
 * Hook para buscar telemarketing online baseado em last_activity_at recente
 */
export function useTelemarketingOnline() {
  return useQuery({
    queryKey: ['telemarketing-online'],
    queryFn: async (): Promise<TelemarketingOnline[]> => {
      const thresholdDate = new Date(Date.now() - ONLINE_THRESHOLD_MINUTES * 60 * 1000);
      
      const { data, error } = await supabase
        .from('telemarketing_operators')
        .select('id, name, bitrix_id, last_activity_at, cargo')
        .gte('last_activity_at', thresholdDate.toISOString())
        .eq('status', 'ativo')
        .order('last_activity_at', { ascending: false });

      if (error) {
        console.error('[useTelemarketingOnline] Error:', error);
        throw error;
      }

      return (data || []) as TelemarketingOnline[];
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
    staleTime: 15000,
  });
}

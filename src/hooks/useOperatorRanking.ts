import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RankingEntry {
  bitrix_telemarketing_id: number;
  operator_name: string;
  total: number;
}

interface OperatorRankingResult {
  position: number;
  total: number;
  ranking: RankingEntry[];
  isLoading: boolean;
}

export function useOperatorRanking(bitrixId: number | null): OperatorRankingResult {
  const { data, isLoading } = useQuery({
    queryKey: ['operator-ranking', bitrixId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_daily_agendados_ranking');
      
      if (error) {
        console.error('Erro ao buscar ranking:', error);
        return [];
      }
      
      return (data || []) as RankingEntry[];
    },
    enabled: !!bitrixId,
    refetchInterval: 60000, // Atualiza a cada minuto
    staleTime: 30000,
  });

  const ranking = data || [];
  const myEntry = ranking.find(r => r.bitrix_telemarketing_id === bitrixId);
  const position = myEntry ? ranking.indexOf(myEntry) + 1 : 0;
  const total = myEntry?.total || 0;

  return {
    position,
    total,
    ranking,
    isLoading,
  };
}

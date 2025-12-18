import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type ComparecimentosPeriod = 'today' | 'week' | 'month' | 'all';

interface ComparecimentoRankingEntry {
  bitrix_telemarketing_id: number;
  operator_name: string;
  total: number;
}

interface ComparecimentosRankingResult {
  position: number;
  total: number;
  ranking: ComparecimentoRankingEntry[];
  isLoading: boolean;
}

export function useComparecimentosRanking(
  bitrixId: number | null,
  period: ComparecimentosPeriod = 'today'
): ComparecimentosRankingResult {
  const { data, isLoading } = useQuery({
    queryKey: ['comparecimentos-ranking', bitrixId, period],
    queryFn: async () => {
      const now = new Date();
      let startStr: string | undefined;
      let endStr: string | undefined;

      // Definir range de datas baseado no período
      switch (period) {
        case 'today':
          startStr = startOfDay(now).toISOString();
          endStr = endOfDay(now).toISOString();
          break;
        case 'week':
          startStr = startOfWeek(now, { locale: ptBR }).toISOString();
          endStr = endOfWeek(now, { locale: ptBR }).toISOString();
          break;
        case 'month':
          startStr = startOfMonth(now).toISOString();
          endStr = endOfMonth(now).toISOString();
          break;
        case 'all':
          // Sem filtro de data
          break;
      }

      // Buscar nomes dos operadores
      const { data: operators } = await supabase
        .from('telemarketing_operators')
        .select('bitrix_id, name');

      const operatorNameMap = new Map<number, string>();
      operators?.forEach(op => {
        if (op.bitrix_id && op.name) {
          operatorNameMap.set(op.bitrix_id, op.name);
        }
      });

      // Buscar leads com compareceu = true
      let query = supabase
        .from('leads')
        .select('bitrix_telemarketing_id')
        .eq('compareceu', true)
        .not('bitrix_telemarketing_id', 'is', null);

      if (startStr && endStr) {
        query = query.gte('date_modify', startStr).lte('date_modify', endStr);
      }

      const { data: leads, error } = await query;

      if (error) {
        console.error('Erro ao buscar ranking de comparecimentos:', error);
        return [];
      }

      // Contar comparecimentos por operador
      const operatorMap = new Map<number, number>();
      leads?.forEach(lead => {
        const opId = lead.bitrix_telemarketing_id;
        if (opId) {
          operatorMap.set(opId, (operatorMap.get(opId) || 0) + 1);
        }
      });

      // Converter para array e ordenar
      const ranking: ComparecimentoRankingEntry[] = Array.from(operatorMap.entries())
        .map(([bitrix_telemarketing_id, total]) => ({
          bitrix_telemarketing_id,
          operator_name: operatorNameMap.get(bitrix_telemarketing_id) || `Operador ${bitrix_telemarketing_id}`,
          total,
        }))
        .sort((a, b) => b.total - a.total);

      return ranking;
    },
    enabled: !!bitrixId,
    refetchInterval: 60000,
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

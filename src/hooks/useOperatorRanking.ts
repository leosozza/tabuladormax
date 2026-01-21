import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay } from 'date-fns';

// IDs de tabulação que representam agendamento (mesmo do useTelemarketingMetrics)
const AGENDADO_STATUS_IDS = ['3620', '3644'];

function isAgendado(statusTabulacao: string | null): boolean {
  if (!statusTabulacao) return false;
  const cleanId = statusTabulacao.replace(/[\[\]]/g, '').trim();
  return AGENDADO_STATUS_IDS.includes(cleanId);
}

interface RankingEntry {
  bitrix_telemarketing_id: number;
  operator_name: string;
  photo_url: string | null;
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
      // Buscar leads modificados hoje (mesmo filtro do dashboard)
      const today = new Date();
      const startStr = startOfDay(today).toISOString();
      const endStr = endOfDay(today).toISOString();

      // Buscar nomes e fotos dos operadores
      const { data: operators } = await supabase
        .from('telemarketing_operators')
        .select('bitrix_id, name, photo_url');

      const operatorDataMap = new Map<number, { name: string; photo_url: string | null }>();
      operators?.forEach(op => {
        if (op.bitrix_id && op.name) {
          operatorDataMap.set(op.bitrix_id, { 
            name: op.name, 
            photo_url: op.photo_url || null 
          });
        }
      });

      // Buscar leads do dia
      const { data: leads, error } = await supabase
        .from('leads')
        .select('bitrix_telemarketing_id, status_tabulacao')
        .gte('date_modify', startStr)
        .lte('date_modify', endStr)
        .not('bitrix_telemarketing_id', 'is', null);

      if (error) {
        console.error('Erro ao buscar ranking:', error);
        return [];
      }

      // Contar agendamentos por operador
      const operatorMap = new Map<number, number>();
      leads?.forEach(lead => {
        const opId = lead.bitrix_telemarketing_id;
        if (opId && isAgendado(lead.status_tabulacao)) {
          operatorMap.set(opId, (operatorMap.get(opId) || 0) + 1);
        }
      });

      // Converter para array e ordenar
      const ranking: RankingEntry[] = Array.from(operatorMap.entries())
        .map(([bitrix_telemarketing_id, total]) => {
          const operatorData = operatorDataMap.get(bitrix_telemarketing_id);
          return {
            bitrix_telemarketing_id,
            operator_name: operatorData?.name || `Operador ${bitrix_telemarketing_id}`,
            photo_url: operatorData?.photo_url || null,
            total,
          };
        })
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

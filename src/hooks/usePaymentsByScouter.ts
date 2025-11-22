import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface DailyPaymentSummary {
  date: string;
  leadCount: number;
  totalValue: number;
  unitValue: number;
  leadIds: number[];
}

export function usePaymentsByScouter(
  projectId: string | null,
  scouter: string | null,
  startDate: Date,
  endDate: Date,
  onlyUnpaid: boolean = true
) {
  return useQuery({
    queryKey: ['payments-by-scouter', projectId, scouter, startDate, endDate, onlyUnpaid],
    queryFn: async () => {
      if (!projectId || !scouter) return { dailySummary: [], total: { leads: 0, value: 0 } };

      let query = supabase
        .from('leads')
        .select('id, criado, valor_ficha, ficha_paga')
        .eq('commercial_project_id', projectId)
        .eq('scouter', scouter)
        .not('valor_ficha', 'is', null)
        .gte('criado', startDate.toISOString())
        .lte('criado', endDate.toISOString())
        .order('criado', { ascending: true });

      const { data: leads, error } = await query;

      if (error) throw error;

      // Agregar por dia
      const dailyMap = new Map<string, DailyPaymentSummary>();

      leads?.forEach((lead) => {
        if (!lead.criado) return;
        
        const dateKey = format(new Date(lead.criado), 'yyyy-MM-dd');
        const existing = dailyMap.get(dateKey) || {
          date: dateKey,
          leadCount: 0,
          totalValue: 0,
          unitValue: lead.valor_ficha || 0,
          leadIds: [],
        };

        existing.leadCount += 1;
        existing.totalValue += lead.valor_ficha || 0;
        existing.leadIds.push(lead.id);

        dailyMap.set(dateKey, existing);
      });

      const dailySummary = Array.from(dailyMap.values());
      const total = {
        leads: leads?.length || 0,
        value: leads?.reduce((sum, lead) => sum + (lead.valor_ficha || 0), 0) || 0,
      };

      return { dailySummary, total, leadIds: leads?.map(l => l.id) || [] };
    },
    enabled: !!projectId && !!scouter,
  });
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ScouterPaymentSummary {
  scouter: string;
  totalLeads: number;
  totalPaid: number;
  totalPending: number;
  totalValue: number;
  avgLeadValue: number;
}

export function usePaymentsByProject(
  projectId: string | null,
  startDate: Date,
  endDate: Date
) {
  return useQuery({
    queryKey: ['payments-by-project', projectId, startDate, endDate],
    queryFn: async () => {
      if (!projectId) return [];

      let query = supabase
        .from('leads')
        .select('scouter, valor_ficha, ficha_paga, id')
        .eq('commercial_project_id', projectId)
        .not('scouter', 'is', null)
        .not('valor_ficha', 'is', null)
        .gte('criado', startDate.toISOString())
        .lte('criado', endDate.toISOString());

      const { data: leads, error } = await query;

      if (error) throw error;

      // Agregar por scouter
      const scouterMap = new Map<string, ScouterPaymentSummary>();

      leads?.forEach((lead) => {
        const scouter = lead.scouter || 'Sem Scouter';
        const existing = scouterMap.get(scouter) || {
          scouter,
          totalLeads: 0,
          totalPaid: 0,
          totalPending: 0,
          totalValue: 0,
          avgLeadValue: 0,
        };

        existing.totalLeads += 1;
        if (lead.ficha_paga) {
          existing.totalPaid += 1;
        } else {
          existing.totalPending += 1;
        }
        existing.totalValue += lead.valor_ficha || 0;

        scouterMap.set(scouter, existing);
      });

      // Calcular média e retornar array ordenado
      const result = Array.from(scouterMap.values()).map((s) => ({
        ...s,
        avgLeadValue: s.totalLeads > 0 ? s.totalValue / s.totalLeads : 0,
      }));

      // Ordenar por total de leads (maior primeiro)
      return result.sort((a, b) => b.totalLeads - a.totalLeads);
    },
    enabled: !!projectId,
  });
}

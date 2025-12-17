import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, subDays, startOfWeek, startOfMonth, format } from 'date-fns';

export type PeriodFilter = 'today' | 'week' | 'month';

interface TelemarketingMetrics {
  totalLeads: number;
  fichasConfirmadas: number;
  agendamentos: number;
  taxaConversao: number;
  operatorPerformance: {
    name: string;
    leads: number;
    confirmadas: number;
    agendamentos: number;
  }[];
  statusDistribution: {
    status: string;
    count: number;
  }[];
  timeline: {
    date: string;
    leads: number;
    confirmadas: number;
  }[];
}

function getDateRange(period: PeriodFilter): { start: Date; end: Date } {
  const now = new Date();
  switch (period) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfDay(now) };
    case 'month':
      return { start: startOfMonth(now), end: endOfDay(now) };
    default:
      return { start: startOfDay(now), end: endOfDay(now) };
  }
}

export function useTelemarketingMetrics(
  period: PeriodFilter = 'today',
  operatorId?: number
) {
  return useQuery({
    queryKey: ['telemarketing-metrics', period, operatorId],
    queryFn: async (): Promise<TelemarketingMetrics> => {
      const { start, end } = getDateRange(period);
      const startStr = start.toISOString();
      const endStr = end.toISOString();

      // Build base query
      let query = supabase
        .from('leads')
        .select('id, name, op_telemarketing, bitrix_telemarketing_id, ficha_confirmada, data_confirmacao_ficha, data_agendamento, status_tabulacao, date_modify')
        .gte('date_modify', startStr)
        .lte('date_modify', endStr)
        .not('bitrix_telemarketing_id', 'is', null);

      if (operatorId) {
        query = query.eq('bitrix_telemarketing_id', operatorId);
      }

      const { data: leads, error } = await query;

      if (error) {
        console.error('Error fetching metrics:', error);
        throw error;
      }

      const leadsData = leads || [];

      // Calculate metrics
      const totalLeads = leadsData.length;
      const fichasConfirmadas = leadsData.filter(l => l.ficha_confirmada === true).length;
      const agendamentos = leadsData.filter(l => l.data_agendamento).length;
      const taxaConversao = totalLeads > 0 ? (fichasConfirmadas / totalLeads) * 100 : 0;

      // Group by operator
      const operatorMap = new Map<string, { leads: number; confirmadas: number; agendamentos: number }>();
      leadsData.forEach(lead => {
        const opName = lead.op_telemarketing || 'Não atribuído';
        const current = operatorMap.get(opName) || { leads: 0, confirmadas: 0, agendamentos: 0 };
        current.leads++;
        if (lead.ficha_confirmada) current.confirmadas++;
        if (lead.data_agendamento) current.agendamentos++;
        operatorMap.set(opName, current);
      });

      const operatorPerformance = Array.from(operatorMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.leads - a.leads)
        .slice(0, 10);

      // Status distribution
      const statusMap = new Map<string, number>();
      leadsData.forEach(lead => {
        const status = lead.status_tabulacao || 'Sem status';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });

      const statusDistribution = Array.from(statusMap.entries())
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      // Timeline (last 7 days for week/month, hourly for today)
      const timeline: { date: string; leads: number; confirmadas: number }[] = [];
      
      if (period === 'today') {
        // Group by hour
        const hourMap = new Map<string, { leads: number; confirmadas: number }>();
        leadsData.forEach(lead => {
          if (lead.date_modify) {
            const hour = format(new Date(lead.date_modify), 'HH:00');
            const current = hourMap.get(hour) || { leads: 0, confirmadas: 0 };
            current.leads++;
            if (lead.ficha_confirmada) current.confirmadas++;
            hourMap.set(hour, current);
          }
        });
        
        // Fill all hours
        for (let h = 8; h <= 20; h++) {
          const hour = `${h.toString().padStart(2, '0')}:00`;
          const data = hourMap.get(hour) || { leads: 0, confirmadas: 0 };
          timeline.push({ date: hour, ...data });
        }
      } else {
        // Group by day
        const dayMap = new Map<string, { leads: number; confirmadas: number }>();
        leadsData.forEach(lead => {
          if (lead.date_modify) {
            const day = format(new Date(lead.date_modify), 'dd/MM');
            const current = dayMap.get(day) || { leads: 0, confirmadas: 0 };
            current.leads++;
            if (lead.ficha_confirmada) current.confirmadas++;
            dayMap.set(day, current);
          }
        });

        // Last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = subDays(new Date(), i);
          const dayStr = format(date, 'dd/MM');
          const data = dayMap.get(dayStr) || { leads: 0, confirmadas: 0 };
          timeline.push({ date: dayStr, ...data });
        }
      }

      return {
        totalLeads,
        fichasConfirmadas,
        agendamentos,
        taxaConversao,
        operatorPerformance,
        statusDistribution,
        timeline,
      };
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });
}

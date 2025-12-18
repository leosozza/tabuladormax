import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, subDays, startOfWeek, startOfMonth, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { resolveTabulacaoLabel } from '@/lib/tabulacaoMapping';
import type { Json } from '@/integrations/supabase/types';

// Verifica se lead está na etapa de Agendados
function isAgendado(etapa: string | null): boolean {
  if (!etapa) return false;
  return etapa === 'UC_QWPO2W' || etapa === 'Agendados';
}

export type PeriodFilter = 'today' | 'yesterday' | 'week' | 'last7days' | 'month' | 'custom';

export interface LeadDetail {
  id: number;
  name: string;
  operatorId: number | null;
  operatorName: string;
  status: string;
  statusLabel: string;
  dataAgendamento?: string;
  fichaConfirmada: boolean;
  isAgendado: boolean;
  fonte: string;
  scouter: string | null;
}

export interface TabulacaoGroup {
  label: string;
  rawStatus: string;
  count: number;
}

export interface OperatorInfo {
  bitrix_id: number;
  name: string;
}

export interface ScouterPerformance {
  name: string;
  agendamentos: number;
  totalLeads: number;
  taxaConversao: number;
}

// New interfaces for agendamentos por data and comparecimentos
export interface AgendamentoPorData {
  data: string;
  dataFormatada: string;
  total: number;
  leads: {
    id: number;
    name: string;
    scouter: string | null;
    telemarketing: string | null;
    fonte: string;
  }[];
}

export interface ComparecimentoDetail {
  id: number;
  name: string;
  scouter: string | null;
  telemarketing: string | null;
  agendadoEm: string | null;
  dataComparecimento: string;
  fonte: string;
}

interface TelemarketingMetrics {
  totalLeads: number;
  agendamentos: number;
  taxaConversao: number;
  agendamentosPorData: AgendamentoPorData[];
  comparecimentos: {
    total: number;
    leads: ComparecimentoDetail[];
  };
  operatorPerformance: {
    name: string;
    bitrix_id?: number;
    leads: number;
    confirmadas: number;
    agendamentos: number;
    leadsScouter: number;
    leadsMeta: number;
  }[];
  scouterPerformance: ScouterPerformance[];
  statusDistribution: {
    status: string;
    count: number;
  }[];
  timeline: {
    date: string;
    leads: number;
    agendados: number;
  }[];
  leadsDetails: LeadDetail[];
  tabulacaoGroups: TabulacaoGroup[];
  availableOperators: OperatorInfo[];
}

// Helper to extract field from raw JSON
function getRawField(raw: Json | null, field: string): string | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const value = (raw as Record<string, Json | undefined>)[field];
  if (typeof value === 'string') return value;
  return null;
}

function getDateRange(period: PeriodFilter, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const now = new Date();
  switch (period) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'yesterday':
      const yesterday = subDays(now, 1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfDay(now) };
    case 'last7days':
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    case 'month':
      return { start: startOfMonth(now), end: endOfDay(now) };
    case 'custom':
      return { 
        start: customStart ? startOfDay(customStart) : startOfDay(now), 
        end: customEnd ? endOfDay(customEnd) : endOfDay(now) 
      };
    default:
      return { start: startOfDay(now), end: endOfDay(now) };
  }
}

export function useTelemarketingMetrics(
  period: PeriodFilter = 'today',
  operatorId?: number,
  customStartDate?: Date,
  customEndDate?: Date
) {
  return useQuery({
    queryKey: ['telemarketing-metrics', period, operatorId, customStartDate?.toISOString(), customEndDate?.toISOString()],
    queryFn: async (): Promise<TelemarketingMetrics> => {
      const { start, end } = getDateRange(period, customStartDate, customEndDate);
      const startStr = start.toISOString();
      const endStr = end.toISOString();

      // Fetch operators to map ID -> Name
      const { data: operators } = await supabase
        .from('telemarketing_operators')
        .select('bitrix_id, name');

      const operatorNameMap = new Map<number, string>();
      operators?.forEach(op => {
        if (op.bitrix_id && op.name) {
          operatorNameMap.set(op.bitrix_id, op.name);
        }
      });

      // Build base query - busca leads modificados no período
      // Includes raw for UF_CRM fields and date_closed for comparecimentos
      let query = supabase
        .from('leads')
        .select('id, name, op_telemarketing, bitrix_telemarketing_id, ficha_confirmada, data_confirmacao_ficha, data_agendamento, data_criacao_agendamento, status_tabulacao, etapa, date_modify, date_closed, nome_modelo, scouter, fonte_normalizada, telemarketing, raw')
        .gte('date_modify', startStr)
        .lte('date_modify', endStr)
        .not('bitrix_telemarketing_id', 'is', null);

      if (operatorId) {
        query = query.eq('bitrix_telemarketing_id', operatorId);
      }

      // Separate query for comparecimentos - filter directly in DB for efficiency
      // Uses contains filter to check UF_CRM_1746816298253 = '1' (presença confirmada)
      let comparecimentosQuery = supabase
        .from('leads')
        .select('id, name, nome_modelo, scouter, telemarketing, bitrix_telemarketing_id, fonte_normalizada, raw')
        .gte('date_modify', startStr)
        .lte('date_modify', endStr)
        .contains('raw', { UF_CRM_1746816298253: '1' });

      if (operatorId) {
        comparecimentosQuery = comparecimentosQuery.eq('bitrix_telemarketing_id', operatorId);
      }

      // Query SEPARADA para agendamentos - filtra por data_criacao_agendamento INDEPENDENTE de date_modify
      // Isso garante que pegamos TODOS os leads agendados no período, mesmo que não tenham sido modificados
      let agendadosQuery = supabase
        .from('leads')
        .select('id, name, nome_modelo, scouter, telemarketing, bitrix_telemarketing_id, fonte_normalizada, data_criacao_agendamento, data_agendamento, raw')
        .gte('data_criacao_agendamento', startStr)
        .lte('data_criacao_agendamento', endStr);

      if (operatorId) {
        agendadosQuery = agendadosQuery.eq('bitrix_telemarketing_id', operatorId);
      }

      const [leadsResult, comparecimentosResult, agendadosResult] = await Promise.all([
        query,
        comparecimentosQuery,
        agendadosQuery
      ]);

      if (leadsResult.error) {
        console.error('Error fetching metrics:', leadsResult.error);
        throw leadsResult.error;
      }

      const leadsData = leadsResult.data || [];
      const allLeadsForComparecimentos = comparecimentosResult.data || [];
      const agendadosData = agendadosResult.data || [];

      // Calculate metrics
      const totalLeads = leadsData.length;
      
      // Agendamentos: vem diretamente da query por data_criacao_agendamento
      // INDEPENDENTE de date_modify ou etapa atual
      const agendadosList = agendadosData;
      const agendamentos = agendadosList.length;
      
      const taxaConversao = totalLeads > 0 ? (agendamentos / totalLeads) * 100 : 0;

      // Calculate agendamentos por data (UF_CRM_1740763672 = target date)
      const agendamentosPorDataMap = new Map<string, { leads: { id: number; name: string; scouter: string | null; telemarketing: string | null; fonte: string; }[] }>();
      agendadosList.forEach(lead => {
        const targetDate = getRawField(lead.raw, 'UF_CRM_1740763672');
        if (!targetDate) return;
        
        // Extrair apenas a data (YYYY-MM-DD) sem conversão de timezone
        // O valor vem como "2025-12-18T03:00:00+03:00", pegamos apenas "2025-12-18"
        const dateKey = targetDate.split('T')[0];
        if (!dateKey || dateKey.length !== 10) return;
        
        const current = agendamentosPorDataMap.get(dateKey) || { leads: [] };
        current.leads.push({
          id: lead.id,
          name: lead.nome_modelo || lead.name || 'Sem nome',
          scouter: lead.scouter || null,
          telemarketing: lead.telemarketing || operatorNameMap.get(lead.bitrix_telemarketing_id!) || null,
          fonte: lead.fonte_normalizada || 'Não informada',
        });
        agendamentosPorDataMap.set(dateKey, current);
      });

      const agendamentosPorData: AgendamentoPorData[] = Array.from(agendamentosPorDataMap.entries())
        .map(([data, { leads }]) => {
          let dataFormatada: string;
          try {
            dataFormatada = format(parseISO(data), "dd/MM/yyyy", { locale: ptBR });
          } catch {
            dataFormatada = data;
          }
          return {
            data,
            dataFormatada,
            total: leads.length,
            leads,
          };
        })
        .sort((a, b) => a.data.localeCompare(b.data));

      // Calculate comparecimentos (UF_CRM_1746816298253 = '1' means attended)
      // Use UF_CRM_DATACOMPARECEU for the attendance date
      // Uses allLeadsForComparecimentos which includes leads without bitrix_telemarketing_id
      const comparecimentosLeads = allLeadsForComparecimentos.filter(lead => {
        const presencaConfirmada = getRawField(lead.raw, 'UF_CRM_1746816298253');
        if (presencaConfirmada !== '1') return false;
        
        // Check if UF_CRM_DATACOMPARECEU is within the period
        const dataCompareceu = getRawField(lead.raw, 'UF_CRM_DATACOMPARECEU');
        if (!dataCompareceu) return false;
        
        try {
          const dateCompareceu = new Date(dataCompareceu);
          return dateCompareceu >= start && dateCompareceu <= end;
        } catch {
          return false;
        }
      });

      const comparecimentos = {
        total: comparecimentosLeads.length,
        leads: comparecimentosLeads.map(lead => ({
          id: lead.id,
          name: lead.nome_modelo || lead.name || 'Sem nome',
          scouter: lead.scouter || null,
          telemarketing: lead.telemarketing || operatorNameMap.get(lead.bitrix_telemarketing_id!) || null,
          agendadoEm: getRawField(lead.raw, 'UF_CRM_AGEND_EM'),
          dataComparecimento: getRawField(lead.raw, 'UF_CRM_DATACOMPARECEU') || '',
          fonte: lead.fonte_normalizada || 'Não informada',
        })),
      };

      // Build leads details for modal
      const leadsDetails: LeadDetail[] = leadsData.map(lead => {
        const opId = lead.bitrix_telemarketing_id;
        const opName = opId ? (operatorNameMap.get(opId) || `Operador ${opId}`) : 'Não atribuído';
        const statusLabel = resolveTabulacaoLabel(lead.status_tabulacao);
        
        return {
          id: lead.id,
          name: lead.nome_modelo || lead.name || 'Sem nome',
          operatorId: opId,
          operatorName: opName,
          status: lead.status_tabulacao || 'Sem status',
          statusLabel,
          dataAgendamento: lead.data_agendamento,
          fichaConfirmada: lead.ficha_confirmada === true,
          isAgendado: isAgendado(lead.etapa),
          fonte: lead.fonte_normalizada || 'Não informada',
          scouter: lead.fonte_normalizada === 'Scouter - Fichas' ? lead.scouter : null,
        };
      });

      // Group by operator using friendly names and track bitrix_id
      const operatorMap = new Map<number, { name: string; leads: number; confirmadas: number; agendamentos: number; leadsScouter: number; leadsMeta: number }>();
      leadsData.forEach(lead => {
        const opId = lead.bitrix_telemarketing_id;
        if (!opId) return; // Skip leads without operator
        
        const opName = operatorNameMap.get(opId) || `Operador ${opId}`;
        const current = operatorMap.get(opId) || { name: opName, leads: 0, confirmadas: 0, agendamentos: 0, leadsScouter: 0, leadsMeta: 0 };
        current.leads++;
        if (lead.ficha_confirmada) current.confirmadas++;
        // Conta agendamento se data_criacao_agendamento no período (independente da etapa atual)
        if (lead.data_criacao_agendamento) {
          const dataAgendamento = new Date(lead.data_criacao_agendamento);
          if (dataAgendamento >= start && dataAgendamento <= end) {
            current.agendamentos++;
          }
        }
        if (lead.fonte_normalizada === 'Scouter - Fichas') current.leadsScouter++;
        if (lead.fonte_normalizada === 'Meta') current.leadsMeta++;
        operatorMap.set(opId, current);
      });

      // Sort by agendamentos first, then conversion rate
      const operatorPerformance = Array.from(operatorMap.entries())
        .map(([bitrix_id, data]) => ({ bitrix_id, ...data }))
        .sort((a, b) => {
          // First sort by agendamentos
          if (b.agendamentos !== a.agendamentos) {
            return b.agendamentos - a.agendamentos;
          }
          // Then by conversion rate
          const taxaA = a.leads > 0 ? a.confirmadas / a.leads : 0;
          const taxaB = b.leads > 0 ? b.confirmadas / b.leads : 0;
          return taxaB - taxaA;
        })
        .slice(0, 10);
      
      // Build available operators list from leads that have activity in the period
      const activeOperatorIds = new Set(
        leadsData
          .filter(l => l.bitrix_telemarketing_id)
          .map(l => l.bitrix_telemarketing_id!)
      );
      
      const availableOperators: OperatorInfo[] = Array.from(activeOperatorIds)
        .map(bitrix_id => ({
          bitrix_id,
          name: operatorNameMap.get(bitrix_id) || `Operador ${bitrix_id}`
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Status distribution with friendly labels
      const statusMap = new Map<string, number>();
      leadsData.forEach(lead => {
        const label = resolveTabulacaoLabel(lead.status_tabulacao);
        statusMap.set(label, (statusMap.get(label) || 0) + 1);
      });

      const statusDistribution = Array.from(statusMap.entries())
        .filter(([status]) => !status.toLowerCase().includes('agendado'))
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      // Tabulacao groups for KPI detail
      const tabulacaoMap = new Map<string, { rawStatus: string; count: number }>();
      leadsData.forEach(lead => {
        const rawStatus = lead.status_tabulacao || '';
        const label = resolveTabulacaoLabel(rawStatus);
        
        const current = tabulacaoMap.get(label) || { rawStatus, count: 0 };
        current.count++;
        tabulacaoMap.set(label, current);
      });

      const tabulacaoGroups: TabulacaoGroup[] = Array.from(tabulacaoMap.entries())
        .filter(([label]) => !label.toLowerCase().includes('agendado'))
        .map(([label, data]) => ({ label, rawStatus: data.rawStatus, count: data.count }))
        .sort((a, b) => b.count - a.count);

      // Timeline - now tracks agendados instead of confirmadas
      const timeline: { date: string; leads: number; agendados: number }[] = [];
      
      if (period === 'today') {
        // Group by hour
        const hourMap = new Map<string, { leads: number; agendados: number }>();
        leadsData.forEach(lead => {
          if (lead.date_modify) {
            const hour = format(new Date(lead.date_modify), 'HH:00');
            const current = hourMap.get(hour) || { leads: 0, agendados: 0 };
            current.leads++;
            if (lead.data_criacao_agendamento) {
              const dataAgendamento = new Date(lead.data_criacao_agendamento);
              if (dataAgendamento >= start && dataAgendamento <= end) {
                current.agendados++;
              }
            }
            hourMap.set(hour, current);
          }
        });
        
        // Fill all hours
        for (let h = 8; h <= 20; h++) {
          const hour = `${h.toString().padStart(2, '0')}:00`;
          const data = hourMap.get(hour) || { leads: 0, agendados: 0 };
          timeline.push({ date: hour, ...data });
        }
      } else {
        // Group by day
        const dayMap = new Map<string, { leads: number; agendados: number }>();
        leadsData.forEach(lead => {
          if (lead.date_modify) {
            const day = format(new Date(lead.date_modify), 'dd/MM');
            const current = dayMap.get(day) || { leads: 0, agendados: 0 };
            current.leads++;
            if (lead.data_criacao_agendamento) {
              const dataAgendamento = new Date(lead.data_criacao_agendamento);
              if (dataAgendamento >= start && dataAgendamento <= end) {
                current.agendados++;
              }
            }
            dayMap.set(day, current);
          }
        });

        // Last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = subDays(new Date(), i);
          const dayStr = format(date, 'dd/MM');
          const data = dayMap.get(dayStr) || { leads: 0, agendados: 0 };
          timeline.push({ date: dayStr, ...data });
        }
      }

      // Top 5 Scouters por agendamentos
      const scouterMap = new Map<string, { leads: number; agendamentos: number }>();
      leadsData.forEach(lead => {
        if (lead.fonte_normalizada === 'Scouter - Fichas' && lead.scouter) {
          const current = scouterMap.get(lead.scouter) || { leads: 0, agendamentos: 0 };
          current.leads++;
          if (lead.data_criacao_agendamento) {
            const dataAgendamento = new Date(lead.data_criacao_agendamento);
            if (dataAgendamento >= start && dataAgendamento <= end) {
              current.agendamentos++;
            }
          }
          scouterMap.set(lead.scouter, current);
        }
      });

      const scouterPerformance: ScouterPerformance[] = Array.from(scouterMap.entries())
        .map(([name, data]) => ({
          name,
          agendamentos: data.agendamentos,
          totalLeads: data.leads,
          taxaConversao: data.leads > 0 ? (data.agendamentos / data.leads) * 100 : 0,
        }))
        .sort((a, b) => b.agendamentos - a.agendamentos)
        .slice(0, 5);

      return {
        totalLeads,
        agendamentos,
        taxaConversao,
        agendamentosPorData,
        comparecimentos,
        operatorPerformance,
        scouterPerformance,
        statusDistribution,
        timeline,
        leadsDetails,
        tabulacaoGroups,
        availableOperators,
      };
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });
}

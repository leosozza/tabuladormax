import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, subDays, addDays, startOfWeek, startOfMonth, format, parseISO } from 'date-fns';
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

      // Usa RPC para buscar métricas agregadas sem limite de 1000 linhas
      const metricsRpcQuery = supabase.rpc('get_telemarketing_metrics', {
        p_start_date: startStr,
        p_end_date: endStr,
        p_operator_id: operatorId || null
      });

      // Query para comparecimentos - usa RPC que filtra diretamente por UF_CRM_DATACOMPARECEU no banco
      const comparecimentosQuery = supabase.rpc('get_comparecidos_by_date', {
        p_start_date: startStr,
        p_end_date: endStr,
        p_operator_id: operatorId || null
      });

      // Query limitada para detalhes de leads (apenas para modais/exibição detalhada)
      let leadsDetailsQuery = supabase
        .from('leads')
        .select('id, name, op_telemarketing, bitrix_telemarketing_id, ficha_confirmada, data_confirmacao_ficha, data_agendamento, data_criacao_agendamento, status_tabulacao, etapa, date_modify, date_closed, nome_modelo, scouter, fonte_normalizada, telemarketing, raw')
        .gte('date_modify', startStr)
        .lte('date_modify', endStr)
        .not('bitrix_telemarketing_id', 'is', null)
        .limit(500);

      if (operatorId) {
        leadsDetailsQuery = leadsDetailsQuery.eq('bitrix_telemarketing_id', operatorId);
      }

      // Query para agendamentos com detalhes (para modal)
      let agendadosQuery = supabase
        .from('leads')
        .select('id, name, nome_modelo, scouter, telemarketing, bitrix_telemarketing_id, fonte_normalizada, data_criacao_agendamento, data_agendamento, raw')
        .gte('data_criacao_agendamento', startStr)
        .lte('data_criacao_agendamento', endStr)
        .limit(500);

      if (operatorId) {
        agendadosQuery = agendadosQuery.eq('bitrix_telemarketing_id', operatorId);
      }

      const [metricsResult, comparecimentosResult, leadsDetailsResult, agendadosResult] = await Promise.all([
        metricsRpcQuery,
        comparecimentosQuery,
        leadsDetailsQuery,
        agendadosQuery
      ]);

      if (metricsResult.error) {
        console.error('Error fetching metrics RPC:', metricsResult.error);
        throw metricsResult.error;
      }

      const metricsData = metricsResult.data as {
        total_leads: number;
        agendamentos: number;
        operator_stats: Array<{
          bitrix_telemarketing_id: number;
          name: string;
          leads: number;
          confirmadas: number;
          agendamentos: number;
          leads_scouter: number;
          leads_meta: number;
        }>;
        tabulacao_stats: Array<{ status: string; count: number }>;
        scouter_stats: Array<{ name: string; total_leads: number; agendamentos: number }>;
      };

      const leadsData = leadsDetailsResult.data || [];
      const agendadosData = agendadosResult.data || [];

      // Use RPC data for counts
      const totalLeads = metricsData?.total_leads || 0;
      const agendamentos = metricsData?.agendamentos || 0;

      // Agendamentos list para detalhes (modal)
      const agendadosList = agendadosData;
      
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

      // Comparecimentos já vem filtrado da RPC por UF_CRM_DATACOMPARECEU
      // Não precisa mais filtrar no JavaScript
      const comparecimentosLeads = comparecimentosResult.data || [];

      const comparecimentos = {
        total: comparecimentosLeads.length,
        leads: comparecimentosLeads.map(lead => ({
          id: lead.id,
          name: lead.nome_modelo || lead.name || 'Sem nome',
          scouter: lead.scouter || null,
          telemarketing: lead.telemarketing || operatorNameMap.get(lead.bitrix_telemarketing_id!) || null,
          agendadoEm: null, // Não disponível na RPC simplificada
          dataComparecimento: lead.data_compareceu || '',
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

      // Operator performance vem da RPC (sem limite de 1000)
      const operatorPerformance = (metricsData?.operator_stats || []).map(op => ({
        bitrix_id: op.bitrix_telemarketing_id,
        name: op.name,
        leads: op.leads,
        confirmadas: op.confirmadas,
        agendamentos: op.agendamentos,
        leadsScouter: op.leads_scouter,
        leadsMeta: op.leads_meta,
      })).slice(0, 10);
      
      // Build available operators list from RPC data
      const availableOperators: OperatorInfo[] = (metricsData?.operator_stats || [])
        .map(op => ({
          bitrix_id: op.bitrix_telemarketing_id,
          name: op.name
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Status distribution vem da RPC (sem limite de 1000)
      const statusDistribution = (metricsData?.tabulacao_stats || [])
        .filter(s => !s.status.toLowerCase().includes('agendado'))
        .map(s => ({ 
          status: resolveTabulacaoLabel(s.status), 
          count: s.count 
        }))
        .slice(0, 8);

      // Tabulacao groups vem da RPC (sem limite de 1000)
      const tabulacaoGroups: TabulacaoGroup[] = (metricsData?.tabulacao_stats || [])
        .filter(s => !s.status.toLowerCase().includes('agendado'))
        .map(s => ({ 
          label: resolveTabulacaoLabel(s.status), 
          rawStatus: s.status, 
          count: s.count 
        }));

      // Timeline - agendados agrupados pelo horário de data_criacao_agendamento (UF_CRM_AGEND_EM)
      // Converte UTC para São Paulo (UTC-3)
      const convertToSaoPaulo = (dateStr: string): Date => {
        const utcDate = new Date(dateStr);
        return new Date(utcDate.getTime() - (3 * 60 * 60 * 1000));
      };

      const timeline: { date: string; leads: number; agendados: number }[] = [];
      
      if (period === 'today') {
        // Group by hour - usar data_criacao_agendamento para agendados
        const hourMapLeads = new Map<string, number>();
        const hourMapAgendados = new Map<string, number>();
        
        leadsData.forEach(lead => {
          // Para LEADS: usar date_modify (atividade no lead)
          if (lead.date_modify) {
            const spDate = convertToSaoPaulo(lead.date_modify);
            const hour = format(spDate, 'HH:00');
            hourMapLeads.set(hour, (hourMapLeads.get(hour) || 0) + 1);
          }
          
          // Para AGENDADOS: usar data_criacao_agendamento (UF_CRM_AGEND_EM)
          if (lead.data_criacao_agendamento) {
            const dataAgendamento = new Date(lead.data_criacao_agendamento);
            if (dataAgendamento >= start && dataAgendamento <= end) {
              const spDate = convertToSaoPaulo(lead.data_criacao_agendamento);
              const hour = format(spDate, 'HH:00');
              hourMapAgendados.set(hour, (hourMapAgendados.get(hour) || 0) + 1);
            }
          }
        });
        
        // Fill all hours (08:00 a 20:00)
        for (let h = 8; h <= 20; h++) {
          const hour = `${h.toString().padStart(2, '0')}:00`;
          timeline.push({ 
            date: hour, 
            leads: hourMapLeads.get(hour) || 0,
            agendados: hourMapAgendados.get(hour) || 0
          });
        }
      } else {
        // Group by day
        const dayMapLeads = new Map<string, number>();
        const dayMapAgendados = new Map<string, number>();
        
        leadsData.forEach(lead => {
          // Para LEADS: usar date_modify
          if (lead.date_modify) {
            const spDate = convertToSaoPaulo(lead.date_modify);
            const day = format(spDate, 'dd/MM');
            dayMapLeads.set(day, (dayMapLeads.get(day) || 0) + 1);
          }
          
          // Para AGENDADOS: usar data_criacao_agendamento
          if (lead.data_criacao_agendamento) {
            const dataAgendamento = new Date(lead.data_criacao_agendamento);
            if (dataAgendamento >= start && dataAgendamento <= end) {
              const spDate = convertToSaoPaulo(lead.data_criacao_agendamento);
              const day = format(spDate, 'dd/MM');
              dayMapAgendados.set(day, (dayMapAgendados.get(day) || 0) + 1);
            }
          }
        });

        // Last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = subDays(new Date(), i);
          const dayStr = format(date, 'dd/MM');
          timeline.push({ 
            date: dayStr, 
            leads: dayMapLeads.get(dayStr) || 0,
            agendados: dayMapAgendados.get(dayStr) || 0
          });
        }
      }

      // Scouter performance vem da RPC (sem limite de 1000)
      const scouterPerformance: ScouterPerformance[] = (metricsData?.scouter_stats || [])
        .map(s => ({
          name: s.name,
          agendamentos: s.agendamentos,
          totalLeads: s.total_leads,
          taxaConversao: s.total_leads > 0 ? (s.agendamentos / s.total_leads) * 100 : 0,
        }))
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

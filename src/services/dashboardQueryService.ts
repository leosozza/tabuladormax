/**
 * Serviço de Query Builder para Dashboard Dinâmico
 * Converte configurações de widgets em queries Supabase e processa métricas
 */

import { supabase } from '@/integrations/supabase/client';
import type { DashboardWidget, DimensionType, MetricType, DateGrouping } from '@/types/dashboard';
import { format, startOfWeek, startOfMonth, startOfYear, startOfQuarter } from 'date-fns';

interface GroupedData {
  [key: string]: any[];
}

interface ProcessedMetrics {
  [key: string]: any;
}

/**
 * Executa query dinâmica baseada na configuração do widget
 */
export async function executeDashboardQuery(widget: DashboardWidget): Promise<any[]> {
  const { filters } = widget;
  
  // Build query
  let query = supabase.from('leads').select('*');
  
  query = query.or('deleted.is.false,deleted.is.null');
  
  // Aplicar filtros
  if (filters?.dataInicio) {
    query = query.gte('criado', filters.dataInicio);
  }
  if (filters?.dataFim) {
    query = query.lte('criado', filters.dataFim);
  }
  if (filters?.scouter?.length) {
    query = query.in('scouter', filters.scouter);
  }
  if (filters?.projeto?.length) {
    query = (query as any).in('commercial_project_id', filters.projeto);
  }
  if (filters?.supervisor?.length) {
    query = (query as any).in('supervisor', filters.supervisor);
  }
  if (filters?.etapa?.length) {
    query = (query as any).in('etapa', filters.etapa);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error executing dashboard query:', error);
    throw error;
  }
  
  // Processar agrupamento e métricas
  return processMetrics(data || [], widget);
}

/**
 * Agrupa dados pela dimensão e calcula métricas
 */
function processMetrics(data: any[], widget: DashboardWidget): ProcessedMetrics[] {
  const { dimension, metrics, dateGrouping, limit, sortBy, sortOrder = 'desc' } = widget;
  
  // Agrupar por dimensão
  const grouped = groupByDimension(data, dimension, dateGrouping);
  
  // Calcular métricas para cada grupo
  let results = Object.entries(grouped).map(([key, rows]) => {
    const result: ProcessedMetrics = { [dimension]: key };
    
    metrics.forEach(metric => {
      result[metric] = calculateMetric(rows, metric);
    });
    
    return result;
  });
  
  // Ordenar se especificado
  if (sortBy) {
    results.sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }
  
  // Limitar resultados se especificado
  if (limit && limit > 0) {
    results = results.slice(0, limit);
  }
  
  return results;
}

/**
 * Agrupa dados pela dimensão especificada
 */
function groupByDimension(
  data: any[],
  dimension: DimensionType,
  dateGrouping?: DateGrouping
): GroupedData {
  const grouped: GroupedData = {};
  
  data.forEach(row => {
    let key: string;
    
    switch (dimension) {
      case 'scouter':
        key = row.scouter || 'Sem Scouter';
        break;
      case 'projeto':
        key = row.commercial_project_id || 'Sem Projeto';
        break;
      case 'supervisor':
        key = row.supervisor || 'Sem Supervisor';
        break;
      case 'localizacao':
        key = row.local_abordagem || row.address || 'Sem Localização';
        break;
      case 'etapa':
        key = row.etapa || row.etapa_funil || 'Sem Etapa';
        break;
      case 'tabulacao':
        key = row.status_tabulacao || 'Sem Tabulação';
        break;
      case 'ficha_confirmada':
        key = row.ficha_confirmada ? 'Confirmada' : 'Não Confirmada';
        break;
      case 'data':
        key = formatDateByGrouping(row.criado, dateGrouping);
        break;
      default:
        key = 'Desconhecido';
    }
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(row);
  });
  
  return grouped;
}

/**
 * Formata data baseada no agrupamento especificado
 */
function formatDateByGrouping(date: string | null, grouping?: DateGrouping): string {
  if (!date) return 'Sem Data';
  
  const d = new Date(date);
  
  switch (grouping) {
    case 'day':
      return format(d, 'dd/MM/yyyy');
    case 'week':
      return format(startOfWeek(d), "'Semana de' dd/MM/yyyy");
    case 'month':
      return format(startOfMonth(d), 'MMM/yyyy');
    case 'quarter':
      return format(startOfQuarter(d), "'Q'Q/yyyy");
    case 'year':
      return format(startOfYear(d), 'yyyy');
    default:
      return format(d, 'dd/MM/yyyy');
  }
}

/**
 * Calcula métrica para um conjunto de dados
 */
function calculateMetric(rows: any[], metric: MetricType): number {
  switch (metric) {
    case 'count_distinct_id':
      return new Set(rows.map(r => r.id)).size;
    
    case 'count_all':
      return rows.length;
    
    case 'sum_valor_ficha':
      return rows.reduce((sum, r) => sum + (parseFloat(r.valor_ficha) || 0), 0);
    
    case 'avg_valor_ficha':
      const total = rows.reduce((sum, r) => sum + (parseFloat(r.valor_ficha) || 0), 0);
      return rows.length > 0 ? total / rows.length : 0;
    
    case 'count_com_foto':
      return rows.filter(r => r.cadastro_existe_foto === true || r.cadastro_existe_foto === 'SIM').length;
    
    case 'count_confirmadas':
      return rows.filter(r => r.ficha_confirmada === true || r.ficha_confirmada === 'Confirmada').length;
    
    case 'count_agendadas':
      return rows.filter(r => r.data_agendamento || r.horario_agendamento).length;
    
    case 'count_compareceu':
      return rows.filter(r => r.compareceu === true || r.compareceu === '1').length;
    
    case 'percent_com_foto':
      const totalRows = rows.length;
      const comFoto = rows.filter(r => r.cadastro_existe_foto === true || r.cadastro_existe_foto === 'SIM').length;
      return totalRows > 0 ? (comFoto / totalRows) * 100 : 0;
    
    case 'percent_confirmadas':
      const totalConfirmadas = rows.length;
      const confirmadas = rows.filter(r => r.ficha_confirmada === true || r.ficha_confirmada === 'Confirmada').length;
      return totalConfirmadas > 0 ? (confirmadas / totalConfirmadas) * 100 : 0;
    
    case 'percent_compareceu':
      const agendadas = rows.filter(r => r.data_agendamento || r.horario_agendamento).length;
      const compareceu = rows.filter(r => r.compareceu === true || r.compareceu === '1').length;
      return agendadas > 0 ? (compareceu / agendadas) * 100 : 0;
    
    default:
      return 0;
  }
}

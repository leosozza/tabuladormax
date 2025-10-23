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
  
  // Build query with explicit any type to avoid deep type instantiation
  let query: any = supabase.from('leads').select('*');
  
  query = query.or('deleted.is.false,deleted.is.null');
  
  // Aplicar filtros usando apenas 'criado' (coluna que existe)
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
    query = query.in('commercial_project_id', filters.projeto);
  }
  if (filters?.supervisor?.length) {
    query = query.in('supervisor', filters.supervisor);
  }
  if (filters?.etapa?.length) {
    query = query.in('etapa', filters.etapa);
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
    
    if (dimension === 'data' && row.criado) {
      // Agrupamento por data com diferentes granularidades
      // Use criado (coluna que existe na tabela fichas)
      const dateStr = row.criado;
      const date = new Date(dateStr);
      switch (dateGrouping) {
        case 'week':
          key = format(startOfWeek(date), 'yyyy-MM-dd');
          break;
        case 'month':
          key = format(startOfMonth(date), 'yyyy-MM');
          break;
        case 'quarter':
          key = format(startOfQuarter(date), 'yyyy-[Q]Q');
          break;
        case 'year':
          key = format(startOfYear(date), 'yyyy');
          break;
        case 'day':
        default:
          key = format(date, 'yyyy-MM-dd');
          break;
      }
    } else {
      // Agrupamento por outros campos
      key = String(row[dimension] || 'Não informado');
    }
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(row);
  });
  
  return grouped;
}

/**
 * Calcula uma métrica específica para um conjunto de linhas
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
      const totalValor = rows.reduce((sum, r) => sum + (parseFloat(r.valor_ficha) || 0), 0);
      return rows.length > 0 ? totalValor / rows.length : 0;
    
    case 'count_com_foto':
      return rows.filter(r => 
        r.cadastro_existe_foto === 'SIM' || 
        r.cadastro_existe_foto === 'Sim' ||
        r.foto
      ).length;
    
    case 'count_confirmadas':
      return rows.filter(r => 
        r.ficha_confirmada === 'Confirmada' ||
        r.ficha_confirmada === 'confirmada'
      ).length;
    
    case 'count_agendadas':
      return rows.filter(r => 
        r.agendado === '1' || 
        r.agendado === 'Sim' ||
        r.data_agendamento
      ).length;
    
    case 'count_compareceu':
      return rows.filter(r => 
        r.compareceu === '1' || 
        r.compareceu === 'Sim'
      ).length;
    
    case 'percent_com_foto':
      const comFoto = rows.filter(r => 
        r.cadastro_existe_foto === 'SIM' || 
        r.cadastro_existe_foto === 'Sim' ||
        r.foto
      ).length;
      return rows.length > 0 ? (comFoto / rows.length) * 100 : 0;
    
    case 'percent_confirmadas':
      const confirmadas = rows.filter(r => 
        r.ficha_confirmada === 'Confirmada' ||
        r.ficha_confirmada === 'confirmada'
      ).length;
      return rows.length > 0 ? (confirmadas / rows.length) * 100 : 0;
    
    case 'percent_compareceu':
      const agendadas = rows.filter(r => 
        r.agendado === '1' || 
        r.agendado === 'Sim' ||
        r.data_agendamento
      ).length;
      const compareceu = rows.filter(r => 
        r.compareceu === '1' || 
        r.compareceu === 'Sim'
      ).length;
      return agendadas > 0 ? (compareceu / agendadas) * 100 : 0;
    
    default:
      return 0;
  }
}

/**
 * Busca opções únicas para filtros dinâmicos
 */
export async function getFilterOptions(field: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('leads')
    .select(field)
    .or('deleted.is.false,deleted.is.null')
    .not(field, 'is', null);
  
  if (error) {
    console.error(`Error fetching filter options for ${field}:`, error);
    return [];
  }
  
  // Extrair valores únicos
  const uniqueValues = new Set(data.map(row => row[field]));
  return Array.from(uniqueValues).filter(Boolean).sort();
}

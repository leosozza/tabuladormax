export interface IndicatorFilterCondition {
  date_filter?: 'today' | 'week' | 'month' | 'custom';
  date_range?: { start: string; end: string };
  scouter?: string[];
  projeto?: string[];
  etapa?: string[];
  confirmado?: string[];
}

export interface IndicatorConfig {
  id: string;
  indicator_key: string;
  title: string;
  source_column: string;
  aggregation: 'count' | 'sum' | 'avg' | 'count_distinct' | 'min' | 'max';
  filter_condition?: IndicatorFilterCondition;
  chart_type: 'number' | 'bar' | 'line' | 'pie' | 'donut' | 'progress';
  format: 'number' | 'currency' | 'percentage';
  position: number;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  color?: string;
}

export const DEFAULT_INDICATORS: Omit<IndicatorConfig, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  {
    indicator_key: 'total_leads',
    title: 'Total de Leads',
    source_column: 'id',
    aggregation: 'count',
    chart_type: 'number',
    format: 'number',
    position: 0,
  },
  {
    indicator_key: 'active_scouters',
    title: 'Scouters Ativos',
    source_column: 'scouter',
    aggregation: 'count_distinct',
    chart_type: 'number',
    format: 'number',
    position: 1,
  },
  {
    indicator_key: 'active_projects',
    title: 'Projetos Ativos',
    source_column: 'projeto',
    aggregation: 'count_distinct',
    chart_type: 'number',
    format: 'number',
    position: 2,
  },
  {
    indicator_key: 'leads_today',
    title: 'Leads Hoje',
    source_column: 'id',
    aggregation: 'count',
    chart_type: 'number',
    format: 'number',
    position: 3,
    filter_condition: { date_filter: 'today' },
  },
];

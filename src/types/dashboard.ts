/**
 * Tipos para o Dashboard Self-Service
 * Permite aos usuários criar painéis customizáveis
 */

export type DimensionType = 
  | 'scouter'         // Agrupamento por scouter
  | 'projeto'         // Agrupamento por projeto
  | 'data'            // Agrupamento por data (dia/semana/mês)
  | 'supervisor'      // Agrupamento por supervisor
  | 'localizacao'     // Agrupamento por localização
  | 'etapa'           // Agrupamento por etapa do funil
  | 'tabulacao'       // Agrupamento por tabulação
  | 'ficha_confirmada'; // Agrupamento por status de confirmação

export type MetricType = 
  | 'count_distinct_id'       // COUNT(DISTINCT id)
  | 'count_all'               // COUNT(*)
  | 'sum_valor_ficha'         // SUM(valor_ficha)
  | 'avg_valor_ficha'         // AVG(valor_ficha)
  | 'count_com_foto'          // COUNT(CASE WHEN cadastro_existe_foto = 'SIM')
  | 'count_confirmadas'       // COUNT(CASE WHEN ficha_confirmada = 'Confirmada')
  | 'count_agendadas'         // COUNT(CASE WHEN agendado = '1')
  | 'count_compareceu'        // COUNT(CASE WHEN compareceu = '1')
  | 'percent_com_foto'        // (count_com_foto / count_all) * 100
  | 'percent_confirmadas'     // (count_confirmadas / count_all) * 100
  | 'percent_compareceu';     // (count_compareceu / count_agendadas) * 100

export type ChartType = 
  | 'table'           // Tabela
  | 'bar'             // Gráfico de barras
  | 'line'            // Gráfico de linhas
  | 'pie'             // Gráfico de pizza
  | 'kpi_card'        // Card de KPI
  | 'area'            // Gráfico de área
  | 'donut'           // Gráfico de rosca
  | 'radar'           // Gráfico de radar
  | 'funnel'          // Gráfico de funil
  | 'gauge'           // Indicador de progresso circular
  | 'heatmap'         // Mapa de calor
  | 'treemap'         // Treemap
  | 'pivot'           // Tabela dinâmica
  | 'scatter';        // Gráfico de dispersão

export type DateGrouping = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface WidgetFilters {
  dataInicio?: string;
  dataFim?: string;
  scouter?: string[];
  projeto?: string[];
  supervisor?: string[];
  etapa?: string[];
}

export type FormulaOperator = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'count_distinct' | 'percent' | 'divide' | 'multiply' | 'subtract' | 'add';

export interface CustomFormula {
  id: string;
  name: string;
  expression: string;
  description?: string;
}

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface WidgetTheme {
  colorScheme?: string[];
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  showGrid?: boolean;
  showLabels?: boolean;
  fontSize?: number;
  fontFamily?: string;
}

export interface DashboardWidget {
  id: string;
  title: string;
  subtitle?: string;
  dimension: DimensionType;
  metrics: MetricType[];
  chartType: ChartType;
  filters?: WidgetFilters;
  dateGrouping?: DateGrouping;
  limit?: number;
  sortBy?: MetricType;
  sortOrder?: 'asc' | 'desc';
  layout?: WidgetLayout;
  theme?: WidgetTheme;
  customFormula?: CustomFormula;
  refreshInterval?: number;
  drilldownEnabled?: boolean;
}

export interface DashboardConfig {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
    accentColor?: string;
  };
  layout?: {
    cols: number;
    rowHeight: number;
    compactType?: 'vertical' | 'horizontal' | null;
  };
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const DIMENSION_LABELS: Record<DimensionType, string> = {
  scouter: 'Scouter',
  projeto: 'Projeto',
  data: 'Data',
  supervisor: 'Supervisor',
  localizacao: 'Localização',
  etapa: 'Etapa',
  tabulacao: 'Tabulação',
  ficha_confirmada: 'Status de Confirmação'
};

export const METRIC_LABELS: Record<MetricType, string> = {
  count_distinct_id: 'Quantidade de Fichas',
  count_all: 'Total de Registros',
  sum_valor_ficha: 'Soma Valor Fichas',
  avg_valor_ficha: 'Média Valor Fichas',
  count_com_foto: 'Fichas com Foto',
  count_confirmadas: 'Fichas Confirmadas',
  count_agendadas: 'Fichas Agendadas',
  count_compareceu: 'Compareceram',
  percent_com_foto: '% Com Foto',
  percent_confirmadas: '% Confirmadas',
  percent_compareceu: '% Comparecimento'
};

export const CHART_TYPE_LABELS: Record<ChartType, string> = {
  table: 'Tabela',
  bar: 'Barras',
  line: 'Linhas',
  pie: 'Pizza',
  kpi_card: 'KPI',
  area: 'Área',
  donut: 'Rosca',
  radar: 'Radar',
  funnel: 'Funil',
  gauge: 'Medidor',
  heatmap: 'Mapa de Calor',
  treemap: 'Treemap',
  pivot: 'Tabela Dinâmica',
  scatter: 'Dispersão'
};

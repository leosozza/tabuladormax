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

// Sistema de fórmulas personalizadas
export type FormulaOperator = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'count_distinct' | 'percent' | 'divide' | 'multiply' | 'subtract' | 'add';

export interface CustomFormula {
  id: string;
  name: string;
  expression: string;
  description?: string;
}

// Configurações de layout para drag & drop
export interface WidgetLayout {
  x: number;      // Posição X no grid (0-11)
  y: number;      // Posição Y no grid
  w: number;      // Largura em colunas do grid (1-12)
  h: number;      // Altura em unidades do grid
  minW?: number;  // Largura mínima
  minH?: number;  // Altura mínima
  maxW?: number;  // Largura máxima
  maxH?: number;  // Altura máxima
}

// Configurações visuais avançadas
export interface WidgetTheme {
  colorScheme?: string[];           // Paleta de cores personalizada
  backgroundColor?: string;         // Cor de fundo
  textColor?: string;              // Cor do texto
  borderColor?: string;            // Cor da borda
  borderWidth?: number;            // Largura da borda
  borderRadius?: number;           // Raio da borda
  showLegend?: boolean;            // Mostrar legenda
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  showGrid?: boolean;              // Mostrar grade
  showLabels?: boolean;            // Mostrar rótulos
  fontSize?: number;               // Tamanho da fonte
  fontFamily?: string;             // Família da fonte
}

export interface DashboardWidget {
  id: string;
  title: string;
  subtitle?: string;
  dimension: DimensionType;
  metrics: MetricType[];
  chartType: ChartType;
  filters?: WidgetFilters;
  dateGrouping?: DateGrouping; // Para dimensão 'data'
  limit?: number; // Limitar resultados (ex: top 10 scouters)
  sortBy?: MetricType; // Ordenar por métrica específica
  sortOrder?: 'asc' | 'desc';
  layout?: WidgetLayout; // Posição e tamanho no grid
  theme?: WidgetTheme; // Configurações visuais
  customFormula?: CustomFormula; // Fórmula personalizada
  refreshInterval?: number; // Intervalo de atualização em ms
  drilldownEnabled?: boolean; // Permite drill-down nos dados
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
    cols: number;        // Número de colunas no grid (padrão: 12)
    rowHeight: number;   // Altura de cada linha em px (padrão: 100)
    compactType?: 'vertical' | 'horizontal' | null;
  };
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// Labels amigáveis para a UI
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
  sum_valor_ficha: 'Valor Total',
  avg_valor_ficha: 'Valor Médio',
  count_com_foto: 'Fichas com Foto',
  count_confirmadas: 'Fichas Confirmadas',
  count_agendadas: 'Fichas Agendadas',
  count_compareceu: 'Comparecimentos',
  percent_com_foto: '% com Foto',
  percent_confirmadas: '% Confirmadas',
  percent_compareceu: '% Comparecimento'
};

export const CHART_TYPE_LABELS: Record<ChartType, string> = {
  table: 'Tabela',
  bar: 'Gráfico de Barras',
  line: 'Gráfico de Linhas',
  pie: 'Gráfico de Pizza',
  kpi_card: 'Card KPI',
  area: 'Gráfico de Área',
  donut: 'Gráfico de Rosca',
  radar: 'Gráfico de Radar',
  funnel: 'Gráfico de Funil',
  gauge: 'Indicador de Progresso',
  heatmap: 'Mapa de Calor',
  treemap: 'Treemap',
  pivot: 'Tabela Dinâmica',
  scatter: 'Gráfico de Dispersão'
};

export const DATE_GROUPING_LABELS: Record<DateGrouping, string> = {
  day: 'Por Dia',
  week: 'Por Semana',
  month: 'Por Mês',
  quarter: 'Por Trimestre',
  year: 'Por Ano'
};

// Paletas de cores predefinidas
export const COLOR_SCHEMES = {
  default: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'],
  blues: ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af'],
  greens: ['#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46'],
  warm: ['#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e'],
  cool: ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af'],
  vibrant: ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4'],
  professional: ['#1e293b', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9']
};

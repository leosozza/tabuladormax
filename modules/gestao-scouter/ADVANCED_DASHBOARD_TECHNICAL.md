# Advanced Dashboard System - Documentação Técnica

## Arquitetura do Sistema

### Visão Geral

O Advanced Dashboard System é implementado seguindo uma arquitetura modular e escalável, com separação clara de responsabilidades entre componentes de apresentação, lógica de negócio e gerenciamento de estado.

```
src/
├── pages/
│   └── AdvancedDashboard.tsx          # Página principal do dashboard
├── components/
│   └── dashboard/
│       ├── DynamicWidget.tsx          # Renderizador dinâmico de widgets
│       ├── WidgetConfigModal.tsx      # Modal de configuração
│       ├── FormulaBuilder.tsx         # Editor de fórmulas
│       └── charts/                    # Componentes de gráficos
│           ├── ApexBarChart.tsx       # Gráfico de barras
│           ├── ApexLineChart.tsx      # Gráfico de linhas
│           ├── ApexAreaChart.tsx      # Gráfico de área
│           ├── ApexPieChart.tsx       # Gráfico de pizza
│           ├── ApexDonutChart.tsx     # Gráfico de rosca
│           ├── RadarChart.tsx         # Gráfico de radar
│           ├── FunnelChart.tsx        # Gráfico de funil
│           ├── GaugeChart.tsx         # Indicador de progresso
│           ├── HeatmapChart.tsx       # Mapa de calor
│           ├── PivotTable.tsx         # Tabela dinâmica
│           ├── ScatterChart.tsx       # Gráfico de dispersão
│           └── TreemapChart.tsx       # Treemap
├── types/
│   └── dashboard.ts                   # Definições de tipos TypeScript
├── hooks/
│   └── useDashboardConfig.ts          # Hook para gerenciamento de configs
├── utils/
│   └── formulaEngine.ts               # Motor de avaliação de fórmulas
└── services/
    └── dashboardQueryService.ts       # Serviço de queries
```

## Componentes Principais

### 1. AdvancedDashboard.tsx

**Responsabilidade**: Gerenciar o estado global do dashboard e coordenar a interação entre widgets.

**Principais Funcionalidades**:
- Gerenciamento do layout via react-grid-layout
- CRUD de widgets (Create, Read, Update, Delete)
- Salvar/Carregar configurações do dashboard
- Export/Import de configurações JSON
- Toggle entre modo edição e visualização

**Estado Gerenciado**:
```typescript
const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
const [currentDashboardId, setCurrentDashboardId] = useState<string | null>(null);
const [dashboardName, setDashboardName] = useState('Dashboard Avançado');
const [dashboardDescription, setDashboardDescription] = useState('');
const [isEditMode, setIsEditMode] = useState(true);
```

**Grid Layout Configuration**:
```typescript
const cols = 12;              // Número de colunas no grid
const rowHeight = 100;        // Altura de cada linha em pixels
```

**Key Methods**:

```typescript
// Atualizar layout quando widgets são movidos/redimensionados
const handleLayoutChange = useCallback((newLayout: any[]) => {
  setWidgets(prevWidgets => 
    prevWidgets.map(widget => {
      const layoutItem = newLayout.find(l => l.i === widget.id);
      if (layoutItem) {
        return {
          ...widget,
          layout: {
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h
          }
        };
      }
      return widget;
    })
  );
}, [isEditMode]);

// Adicionar ou atualizar widget
const handleAddWidget = (widget: DashboardWidget) => {
  if (editingWidget) {
    setWidgets(widgets.map(w => w.id === widget.id ? widget : w));
  } else {
    const newWidget = {
      ...widget,
      layout: { x: 0, y: Infinity, w: 4, h: 3 }
    };
    setWidgets([...widgets, newWidget]);
  }
};
```

### 2. DynamicWidget.tsx

**Responsabilidade**: Renderizar widgets dinamicamente baseado em sua configuração.

**Principais Funcionalidades**:
- Carregar dados via React Query
- Selecionar e renderizar tipo de gráfico apropriado
- Gerenciar estados de loading e erro
- Formatar dados para cada tipo de visualização

**Estrutura de Renderização**:

```typescript
function WidgetContent({ config, data }: WidgetContentProps) {
  const dimensionKey = config.dimension;
  const valueKeys = config.metrics;
  
  switch (config.chartType) {
    case 'bar':
      return <ApexBarChart data={data} categoryKey={dimensionKey} valueKeys={valueKeys} />;
    case 'line':
      return <ApexLineChart data={data} categoryKey={dimensionKey} valueKeys={valueKeys} />;
    // ... outros casos para os 14 tipos de gráficos
  }
}
```

**Data Fetching**:
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['dashboard-widget', config.id, config],
  queryFn: () => executeDashboardQuery(config),
  refetchInterval: 60000 // Atualizar a cada 1 minuto
});
```

### 3. WidgetConfigModal.tsx

**Responsabilidade**: Interface para configuração de widgets.

**Estrutura de Tabs**:

1. **Configuração Básica**
   - Título e subtítulo
   - Seleção de dimensão
   - Seleção de métricas
   - Tipo de visualização

2. **Aparência**
   - Esquema de cores
   - Posição da legenda
   - Visibilidade de grid e labels

3. **Fórmula**
   - Criar/editar fórmulas customizadas
   - Integração com FormulaBuilder

4. **Avançado**
   - Limite de resultados
   - Configurações específicas do tipo de gráfico

**Validação**:
```typescript
const handleSave = () => {
  // Validar que pelo menos uma métrica foi selecionada
  if (metrics.length === 0) return;
  
  const widget: DashboardWidget = {
    id: initialWidget?.id || `widget-${Date.now()}`,
    title: title || 'Novo Painel',
    dimension,
    metrics,
    chartType,
    theme: { /* configurações visuais */ },
    customFormula // Fórmula personalizada se definida
  };
  
  onSave(widget);
};
```

### 4. FormulaBuilder.tsx

**Responsabilidade**: Editor visual para criar fórmulas customizadas.

**Funcionalidades**:
- Syntax highlighting
- Validação em tempo real
- Templates predefinidos
- Inserção de funções e campos
- Documentação inline

**Validação de Fórmulas**:
```typescript
const handleExpressionChange = (value: string) => {
  setExpression(value);
  const result = validateFormula(value);
  setValidation(result);
};
```

**Templates Disponíveis**:
```typescript
export const FORMULA_TEMPLATES = {
  'Taxa de Conversão %': 'PERCENT(COUNT_DISTINCT(id_convertido), COUNT_DISTINCT(id))',
  'Valor Médio': 'AVG(valor_ficha)',
  'Ticket Médio': 'DIVIDE(SUM(valor_ficha), COUNT(*))',
  'ROI %': 'PERCENT(SUBTRACT(SUM(receita), SUM(custo)), SUM(custo))'
};
```

## Sistema de Tipos

### DashboardWidget

```typescript
export interface DashboardWidget {
  id: string;                           // Identificador único
  title: string;                        // Título do widget
  subtitle?: string;                    // Subtítulo opcional
  dimension: DimensionType;             // Dimensão para agrupamento
  metrics: MetricType[];                // Métricas a serem calculadas
  chartType: ChartType;                 // Tipo de visualização
  filters?: WidgetFilters;              // Filtros aplicados
  dateGrouping?: DateGrouping;          // Agrupamento temporal
  limit?: number;                       // Limite de resultados
  sortBy?: MetricType;                  // Métrica para ordenação
  sortOrder?: 'asc' | 'desc';          // Direção da ordenação
  layout?: WidgetLayout;                // Posição e tamanho no grid
  theme?: WidgetTheme;                  // Configurações visuais
  customFormula?: CustomFormula;        // Fórmula personalizada
  refreshInterval?: number;             // Intervalo de atualização (ms)
  drilldownEnabled?: boolean;           // Habilitar drill-down
}
```

### WidgetLayout

```typescript
export interface WidgetLayout {
  x: number;      // Posição X no grid (0-11)
  y: number;      // Posição Y no grid
  w: number;      // Largura em colunas (1-12)
  h: number;      // Altura em unidades
  minW?: number;  // Largura mínima
  minH?: number;  // Altura mínima
  maxW?: number;  // Largura máxima
  maxH?: number;  // Altura máxima
}
```

### WidgetTheme

```typescript
export interface WidgetTheme {
  colorScheme?: string[];              // Paleta de cores
  backgroundColor?: string;            // Cor de fundo
  textColor?: string;                  // Cor do texto
  showLegend?: boolean;                // Mostrar legenda
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  showGrid?: boolean;                  // Mostrar grade
  showLabels?: boolean;                // Mostrar rótulos
  fontSize?: number;                   // Tamanho da fonte
}
```

## Motor de Fórmulas

### Arquitetura

O motor de fórmulas (`formulaEngine.ts`) implementa um parser e avaliador de expressões customizadas.

**Parse de Fórmulas**:
```typescript
export function parseFormula(formula: string): FormulaExpression {
  const clean = formula.trim();
  
  // Detectar funções: FUNC(args)
  const functionMatch = clean.match(/^([A-Z_]+)\((.*)\)$/);
  if (functionMatch) {
    const [, func, argsStr] = functionMatch;
    return {
      type: 'function',
      value: func,
      args: parseArguments(argsStr)
    };
  }
  
  // Detectar números
  const numMatch = clean.match(/^-?\d+(\.\d+)?$/);
  if (numMatch) {
    return { type: 'constant', value: parseFloat(clean) };
  }
  
  // Detectar operadores: a + b, a - b, etc.
  const operatorMatch = clean.match(/^(.+)\s*([\+\-\*\/])\s*(.+)$/);
  if (operatorMatch) {
    const [, left, op, right] = operatorMatch;
    return {
      type: 'operator',
      value: operatorMap[op],
      args: [parseFormula(left), parseFormula(right)]
    };
  }
  
  // Caso contrário, é uma referência a campo
  return { type: 'field', value: clean };
}
```

**Avaliação de Fórmulas**:
```typescript
export function evaluateFormula(
  expression: FormulaExpression,
  data: Record<string, number | string>[]
): number {
  switch (expression.type) {
    case 'constant':
      return Number(expression.value);
    
    case 'field':
      return data.reduce((sum, row) => {
        const val = row[String(expression.value)];
        return sum + (typeof val === 'number' ? val : parseFloat(String(val)) || 0);
      }, 0);
    
    case 'function':
      return evaluateFunction(String(expression.value), expression.args || [], data);
    
    case 'operator':
      return evaluateFunction(String(expression.value), expression.args || [], data);
  }
}
```

**Funções Implementadas**:

- `SUM(campo)` - Soma valores
- `AVG(campo)` - Calcula média
- `MIN(campo)` - Valor mínimo
- `MAX(campo)` - Valor máximo
- `COUNT(*)` - Conta registros
- `COUNT_DISTINCT(campo)` - Conta valores únicos
- `PERCENT(num, den)` - Calcula percentual
- `DIVIDE(a, b)` - Divisão segura (evita divisão por zero)
- `MULTIPLY(a, b)` - Multiplicação
- `ADD(a, b)` - Adição
- `SUBTRACT(a, b)` - Subtração

## Componentes de Gráficos

### Estrutura Comum

Todos os componentes de gráficos seguem uma estrutura similar:

```typescript
interface ChartProps {
  data: any[];                    // Dados a serem visualizados
  categoryKey?: string;           // Campo para categorias
  valueKeys?: string[];           // Campos para valores
  colors?: string[];              // Paleta de cores
  height?: number;                // Altura do gráfico
  showLegend?: boolean;           // Mostrar legenda
  // Props específicas do tipo de gráfico
}

export function ChartComponent({ data, categoryKey, valueKeys, ... }: ChartProps) {
  // Processar dados
  const chartData = useMemo(() => processData(data), [data]);
  
  // Configurar opções do ApexCharts
  const chartOptions: ApexOptions = useMemo(() => ({
    chart: { type: 'bar', toolbar: { show: true } },
    colors: colors,
    legend: { show: showLegend },
    // ... outras configurações
  }), [colors, showLegend]);
  
  // Renderizar
  return (
    <ReactApexChart
      options={chartOptions}
      series={chartSeries}
      type="bar"
      height={height}
    />
  );
}
```

### Gráficos Implementados

#### 1. TreemapChart (Novo)

Visualiza hierarquias usando retângulos proporcionais.

```typescript
export function TreemapChart({ 
  data,        // Array de { name, value }
  colors,      // Paleta de cores
  height,      // Altura
  showLegend,  // Exibir legenda
  distributed  // Cores distribuídas
}: TreemapChartProps)
```

**Uso Ideal**:
- Distribuição de valores em categorias
- Comparação de proporções
- Hierarquias simples

#### 2. ScatterChart (Novo)

Mostra correlação entre duas variáveis.

```typescript
export function ScatterChart({ 
  data,        // Array de { x, y, label }
  xLabel,      // Rótulo do eixo X
  yLabel,      // Rótulo do eixo Y
  colors,      // Paleta de cores
  height,      // Altura
  showLegend,  // Exibir legenda
  series       // Séries múltiplas (opcional)
}: ScatterChartProps)
```

**Uso Ideal**:
- Identificar correlações
- Detectar outliers
- Análise de clusters

## Gerenciamento de Estado

### React Query

Usado para cache e sincronização de dados:

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['dashboard-widget', config.id, config],
  queryFn: () => executeDashboardQuery(config),
  refetchInterval: 60000, // Atualização automática
  staleTime: 30000,       // Dados considerados frescos por 30s
  cacheTime: 300000       // Cache mantido por 5 minutos
});
```

### useDashboardConfig Hook

Hook customizado para gerenciar configurações de dashboard:

```typescript
export function useDashboardConfig() {
  const { data: configs, isLoading } = useQuery({
    queryKey: ['dashboard-configs'],
    queryFn: () => fetchDashboardConfigs()
  });
  
  const saveDashboard = useMutation({
    mutationFn: (config: DashboardConfig) => saveDashboardConfig(config),
    onSuccess: () => queryClient.invalidateQueries(['dashboard-configs'])
  });
  
  const updateDashboard = useMutation({
    mutationFn: (config: DashboardConfig) => updateDashboardConfig(config),
    onSuccess: () => queryClient.invalidateQueries(['dashboard-configs'])
  });
  
  const deleteDashboard = useMutation({
    mutationFn: (id: string) => deleteDashboardConfig(id),
    onSuccess: () => queryClient.invalidateQueries(['dashboard-configs'])
  });
  
  return { configs, isLoading, saveDashboard, updateDashboard, deleteDashboard };
}
```

## Persistência de Dados

### Estrutura no Supabase

```sql
CREATE TABLE dashboard_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  widgets JSONB NOT NULL,
  layout JSONB,
  theme JSONB,
  is_default BOOLEAN DEFAULT false,
  auto_refresh BOOLEAN DEFAULT false,
  refresh_interval INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_dashboard_configs_user_id ON dashboard_configs(user_id);
CREATE INDEX idx_dashboard_configs_is_default ON dashboard_configs(is_default);
```

### Operações CRUD

```typescript
// Criar dashboard
async function saveDashboardConfig(config: DashboardConfig): Promise<DashboardConfig> {
  const { data, error } = await supabase
    .from('dashboard_configs')
    .insert({
      name: config.name,
      description: config.description,
      widgets: config.widgets,
      layout: config.layout,
      is_default: config.is_default
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Atualizar dashboard
async function updateDashboardConfig(config: DashboardConfig): Promise<void> {
  const { error } = await supabase
    .from('dashboard_configs')
    .update({
      name: config.name,
      description: config.description,
      widgets: config.widgets,
      layout: config.layout,
      updated_at: new Date().toISOString()
    })
    .eq('id', config.id);
  
  if (error) throw error;
}

// Deletar dashboard
async function deleteDashboardConfig(id: string): Promise<void> {
  const { error } = await supabase
    .from('dashboard_configs')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// Listar dashboards
async function fetchDashboardConfigs(): Promise<DashboardConfig[]> {
  const { data, error } = await supabase
    .from('dashboard_configs')
    .select('*')
    .order('updated_at', { ascending: false });
  
  if (error) throw error;
  return data;
}
```

## Performance e Otimizações

### 1. Code Splitting

Componentes de gráficos são carregados dinamicamente:

```typescript
const TreemapChart = lazy(() => import('./charts/TreemapChart'));
const ScatterChart = lazy(() => import('./charts/ScatterChart'));
```

### 2. Memoization

Uso extensivo de `useMemo` e `useCallback` para evitar re-renders desnecessários:

```typescript
const layout = useMemo(() => {
  return widgets.map((widget, index) => ({
    i: widget.id,
    x: widget.layout?.x ?? (index % 3) * 4,
    y: widget.layout?.y ?? Math.floor(index / 3) * 3,
    w: widget.layout?.w ?? 4,
    h: widget.layout?.h ?? 3
  }));
}, [widgets]);

const handleLayoutChange = useCallback((newLayout: any[]) => {
  // ... lógica de atualização
}, [isEditMode]);
```

### 3. React Query Cache

Configuração otimizada de cache:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,        // 30 segundos
      cacheTime: 300000,       // 5 minutos
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});
```

### 4. Debouncing

Para operações custosas como layout changes:

```typescript
import { debounce } from 'lodash';

const debouncedLayoutChange = useMemo(
  () => debounce((layout) => {
    handleLayoutChange(layout);
  }, 300),
  []
);
```

## Segurança

### 1. Validação de Input

Todas as entradas de usuário são validadas:

```typescript
// Validação de fórmulas
export function validateFormula(formula: string): { valid: boolean; error?: string } {
  try {
    const expression = parseFormula(formula);
    // Verificar se funções são válidas
    // Verificar se campos existem
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid formula'
    };
  }
}

// Validação de configuração de widget
function validateWidgetConfig(config: DashboardWidget): boolean {
  if (!config.title || config.title.trim() === '') return false;
  if (config.metrics.length === 0) return false;
  if (!CHART_TYPES.includes(config.chartType)) return false;
  return true;
}
```

### 2. Sanitização de Dados

Dados são sanitizados antes de serem renderizados:

```typescript
import DOMPurify from 'dompurify';

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html);
}
```

### 3. Row Level Security (RLS)

Políticas no Supabase garantem que usuários só acessem seus próprios dashboards:

```sql
-- Política de SELECT
CREATE POLICY "Users can view their own dashboards"
ON dashboard_configs FOR SELECT
USING (auth.uid() = user_id);

-- Política de INSERT
CREATE POLICY "Users can create their own dashboards"
ON dashboard_configs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Política de UPDATE
CREATE POLICY "Users can update their own dashboards"
ON dashboard_configs FOR UPDATE
USING (auth.uid() = user_id);

-- Política de DELETE
CREATE POLICY "Users can delete their own dashboards"
ON dashboard_configs FOR DELETE
USING (auth.uid() = user_id);
```

## Testes

### Estrutura de Testes (Recomendada)

```typescript
// DynamicWidget.test.tsx
describe('DynamicWidget', () => {
  it('should render bar chart when chartType is bar', () => {
    const config: DashboardWidget = {
      id: 'test-1',
      title: 'Test Chart',
      dimension: 'scouter',
      metrics: ['count_distinct_id'],
      chartType: 'bar'
    };
    
    render(<DynamicWidget config={config} />);
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });
  
  it('should handle loading state', () => {
    // ... teste de loading
  });
  
  it('should handle error state', () => {
    // ... teste de erro
  });
});

// formulaEngine.test.ts
describe('Formula Engine', () => {
  it('should parse simple SUM formula', () => {
    const result = parseFormula('SUM(valor_ficha)');
    expect(result.type).toBe('function');
    expect(result.value).toBe('SUM');
  });
  
  it('should evaluate SUM correctly', () => {
    const data = [
      { valor_ficha: 100 },
      { valor_ficha: 200 },
      { valor_ficha: 300 }
    ];
    const expression = parseFormula('SUM(valor_ficha)');
    const result = evaluateFormula(expression, data);
    expect(result).toBe(600);
  });
  
  it('should handle division by zero', () => {
    const expression = parseFormula('DIVIDE(100, 0)');
    const result = evaluateFormula(expression, []);
    expect(result).toBe(0);
  });
});
```

## Debugging

### Console Logging

Sistema de logs estruturado:

```typescript
const DEBUG = process.env.NODE_ENV === 'development';

function log(category: string, message: string, data?: any) {
  if (!DEBUG) return;
  console.log(`[${category}] ${message}`, data || '');
}

// Uso
log('Dashboard', 'Widget adicionado', widget);
log('Formula', 'Avaliando expressão', { expression, data });
log('Grid', 'Layout atualizado', newLayout);
```

### React DevTools

Componentes são nomeados para facilitar debugging:

```typescript
DynamicWidget.displayName = 'DynamicWidget';
WidgetConfigModal.displayName = 'WidgetConfigModal';
FormulaBuilder.displayName = 'FormulaBuilder';
```

## Extensibilidade

### Adicionar Novo Tipo de Gráfico

1. **Definir tipo**:
```typescript
// types/dashboard.ts
export type ChartType = 
  | 'existing_types'
  | 'new_chart_type';
```

2. **Criar componente**:
```typescript
// components/dashboard/charts/NewChart.tsx
export function NewChart({ data, config }: NewChartProps) {
  return <ReactApexChart ... />;
}
```

3. **Adicionar ao DynamicWidget**:
```typescript
// components/dashboard/DynamicWidget.tsx
case 'new_chart_type':
  return <NewChart data={data} config={config} />;
```

4. **Adicionar ao WidgetConfigModal**:
```typescript
// components/dashboard/WidgetConfigModal.tsx
const availableChartTypes: ChartType[] = [
  ...existing,
  'new_chart_type'
];
```

### Adicionar Nova Função de Fórmula

```typescript
// utils/formulaEngine.ts
function evaluateFunction(func: string, args: FormulaExpression[], data: any[]): number {
  switch (func) {
    // ... funções existentes
    
    case 'NEW_FUNCTION': {
      // Implementar lógica
      return result;
    }
  }
}

// Adicionar à documentação
export function getFormuleFunctions() {
  return [
    // ... funções existentes
    {
      name: 'NEW_FUNCTION',
      description: 'Descrição da nova função',
      example: 'NEW_FUNCTION(arg1, arg2)'
    }
  ];
}
```

## Roadmap Técnico

### Curto Prazo
- [ ] Implementar testes unitários
- [ ] Adicionar E2E tests com Playwright
- [ ] Melhorar performance com virtualização de widgets
- [ ] Implementar undo/redo para edições

### Médio Prazo
- [ ] Suporte a drill-down em gráficos
- [ ] Filtros globais de dashboard
- [ ] Temas customizados completos
- [ ] Compartilhamento de dashboards entre usuários

### Longo Prazo
- [ ] Dashboard colaborativo em tempo real
- [ ] Machine Learning para sugestões de visualizações
- [ ] API pública para integração externa
- [ ] Mobile app nativo

---

**Versão**: 1.0.0  
**Última Atualização**: Outubro 2025  
**Autor**: Sistema de Dashboard Avançado

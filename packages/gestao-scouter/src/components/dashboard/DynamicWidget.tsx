/**
 * Componente que renderiza um widget dinâmico baseado em sua configuração
 */

import { useQuery } from '@tanstack/react-query';
import { executeDashboardQuery } from '@/services/dashboardQueryService';
import type { DashboardWidget } from '@/types/dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SimpleDataTable } from '@/components/shared/SimpleDataTable';
import { DIMENSION_LABELS, METRIC_LABELS } from '@/types/dashboard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Edit, Trash2, Activity, Filter as FilterIcon, Gauge as GaugeIcon, Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart3, LineChart as LineChartIcon, Table2, PieChart, FileText, AreaChart, TrendingUp } from 'lucide-react';
import { RadarChart } from './charts/RadarChart';
import { FunnelChart } from './charts/FunnelChart';
import { GaugeChart } from './charts/GaugeChart';
import { HeatmapChart } from './charts/HeatmapChart';
import { PivotTable } from './charts/PivotTable';
import { ApexBarChart } from './charts/ApexBarChart';
import { ApexLineChart } from './charts/ApexLineChart';
import { ApexAreaChart } from './charts/ApexAreaChart';
import { ApexPieChart } from './charts/ApexPieChart';
import { ApexDonutChart } from './charts/ApexDonutChart';
import { TreemapChart } from './charts/TreemapChart';
import { ScatterChart } from './charts/ScatterChart';

interface DynamicWidgetProps {
  config: DashboardWidget;
  onEdit?: (widget: DashboardWidget) => void;
  onDelete?: (widgetId: string) => void;
}

export function DynamicWidget({ config, onEdit, onDelete }: DynamicWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-widget', config.id, config],
    queryFn: () => executeDashboardQuery(config),
    refetchInterval: 60000 // Atualizar a cada 1 minuto
  });
  
  const getChartIcon = () => {
    switch (config.chartType) {
      case 'bar': return <BarChart3 className="h-4 w-4" />;
      case 'line': return <LineChartIcon className="h-4 w-4" />;
      case 'area': return <AreaChart className="h-4 w-4" />;
      case 'pie': return <PieChart className="h-4 w-4" />;
      case 'donut': return <PieChart className="h-4 w-4" />;
      case 'table': return <Table2 className="h-4 w-4" />;
      case 'kpi_card': return <FileText className="h-4 w-4" />;
      case 'radar': return <Activity className="h-4 w-4" />;
      case 'funnel': return <FilterIcon className="h-4 w-4" />;
      case 'gauge': return <GaugeIcon className="h-4 w-4" />;
      case 'heatmap': return <Grid3x3 className="h-4 w-4" />;
      case 'pivot': return <Table2 className="h-4 w-4" />;
      case 'scatter': return <TrendingUp className="h-4 w-4" />;
      case 'treemap': return <Grid3x3 className="h-4 w-4" />;
      default: return null;
    }
  };
  
  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getChartIcon()}
            <div>
              <CardTitle className="text-lg">{config.title}</CardTitle>
              <CardDescription className="text-sm mt-1">
                {DIMENSION_LABELS[config.dimension]} • {config.metrics.map(m => METRIC_LABELS[m]).join(', ')}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(config)}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(config.id)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar dados: {error.message}
            </AlertDescription>
          </Alert>
        )}
        
        {!isLoading && !error && data && (
          <WidgetContent config={config} data={data} />
        )}
      </CardContent>
    </Card>
  );
}

interface WidgetContentProps {
  config: DashboardWidget;
  data: any[];
}

/**
 * Transform dashboard data to format expected by Apex chart components
 */
function transformDataForApexCharts(
  data: any[],
  categoryKey: string,
  valueKeys: string[]
): { categories: string[]; series: { name: string; data: number[] }[] } {
  const categories = data.map(item => String(item[categoryKey] || 'N/A'));
  const series = valueKeys.map(key => ({
    name: METRIC_LABELS[key as keyof typeof METRIC_LABELS] || key,
    data: data.map(item => Number(item[key]) || 0)
  }));
  
  return { categories, series };
}

/**
 * Transform dashboard data for pie/donut charts
 */
function transformDataForPieCharts(
  data: any[],
  categoryKey: string,
  valueKey: string
): { labels: string[]; series: number[] } {
  const labels = data.map(item => String(item[categoryKey] || 'N/A'));
  const series = data.map(item => Number(item[valueKey]) || 0);
  
  return { labels, series };
}

function WidgetContent({ config, data }: WidgetContentProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum dado encontrado para os filtros selecionados
      </div>
    );
  }
  
  const dimensionKey = config.dimension;
  const valueKeys = config.metrics;
  const firstMetric = config.metrics[0];

  // Helper function to transform data for charts
  const getCategories = () => data.map(d => String(d[dimensionKey] || 'N/A'));
  
  const getSeries = (metrics: string[]) => {
    return metrics.map(metric => ({
      name: METRIC_LABELS[metric] || metric,
      data: data.map(d => Number(d[metric]) || 0)
    }));
  };

  switch (config.chartType) {
    case 'table':
      return <TableView config={config} data={data} />;
    
    case 'bar': {
      return (
        <ApexBarChart
          title={config.title}
          categories={getCategories()}
          series={getSeries(valueKeys)}
          height={350}
        />
      );
    }
    
    case 'line': {
      return (
        <ApexLineChart
          title={config.title}
          categories={getCategories()}
          series={getSeries(valueKeys)}
          height={350}
        />
      );
    }
    
    case 'area': {
      return (
        <ApexAreaChart
          title={config.title}
          categories={getCategories()}
          series={getSeries(valueKeys)}
          height={350}
        />
      );
    }
    
    case 'pie': {
      return (
        <ApexPieChart
          title={config.title}
          labels={getCategories()}
          series={data.map(d => Number(d[firstMetric]) || 0)}
          height={350}
        />
      );
    }
    
    case 'donut': {
      return (
        <ApexDonutChart
          title={config.title}
          labels={getCategories()}
          series={data.map(d => Number(d[firstMetric]) || 0)}
          height={350}
        />
      );
    }
    
    case 'radar':
      return (
        <RadarChart
          data={data}
          categoryKey={dimensionKey}
          valueKeys={valueKeys}
          colors={config.theme?.colorScheme}
          height={350}
          showLegend={config.theme?.showLegend}
        />
      );
    
    case 'funnel':
      return (
        <FunnelChart
          data={data.map(d => ({
            stage: String(d[dimensionKey]),
            value: Number(d[firstMetric]) || 0
          }))}
          height={350}
          showPercentages={true}
          showValues={true}
        />
      );
    
    case 'gauge': {
      const gaugeValue = data[0] ? Number(data[0][firstMetric]) || 0 : 0;
      return (
        <GaugeChart
          value={gaugeValue}
          label={METRIC_LABELS[firstMetric]}
          height={350}
        />
      );
    }
    
    case 'heatmap':
      if (config.metrics.length < 1) {
        return <div className="text-center py-8 text-muted-foreground">Mapa de calor requer pelo menos 1 métrica</div>;
      }
      return (
        <HeatmapChart
          data={data}
          xKey={dimensionKey}
          yKey={dimensionKey}
          valueKey={firstMetric}
          height={350}
        />
      );
    
    case 'pivot':
      if (config.metrics.length < 1) {
        return <div className="text-center py-8 text-muted-foreground">Tabela dinâmica requer pelo menos 1 métrica</div>;
      }
      return (
        <PivotTable
          data={data}
          rowKey={dimensionKey}
          columnKey={dimensionKey}
          valueKey={firstMetric}
          aggregation="sum"
          showTotals={true}
        />
      );
    
    case 'treemap':
      return (
        <TreemapChart
          data={data.map(d => ({
            name: String(d[dimensionKey]),
            value: Number(d[firstMetric]) || 0
          }))}
          colors={config.theme?.colorScheme}
          height={350}
          showLegend={config.theme?.showLegend}
        />
      );
    
    case 'scatter': {
      if (config.metrics.length < 2) {
        return <div className="text-center py-8 text-muted-foreground">Gráfico de dispersão requer pelo menos 2 métricas</div>;
      }
      const xMetric = config.metrics[0];
      const yMetric = config.metrics[1];
      return (
        <ScatterChart
          data={data.map(d => ({
            x: Number(d[xMetric]) || 0,
            y: Number(d[yMetric]) || 0,
            label: String(d[dimensionKey])
          }))}
          xLabel={METRIC_LABELS[xMetric]}
          yLabel={METRIC_LABELS[yMetric]}
          colors={config.theme?.colorScheme}
          height={350}
          showLegend={config.theme?.showLegend}
        />
      );
    }
    
    case 'kpi_card':
      return <KPIView config={config} data={data} />;
    
    default:
      return (
        <div className="text-center py-8 text-muted-foreground">
          Tipo de gráfico não implementado: {config.chartType}
        </div>
      );
  }
}

function TableView({ config, data }: WidgetContentProps) {
  const columns = [
    {
      id: config.dimension,
      header: DIMENSION_LABELS[config.dimension],
      accessorKey: config.dimension,
      cell: ({ row }: any) => {
        const value = row.getValue(config.dimension);
        return <div className="font-medium">{value || 'N/A'}</div>;
      }
    },
    ...config.metrics.map(metric => ({
      id: metric,
      header: METRIC_LABELS[metric],
      accessorKey: metric,
      cell: ({ row }: any) => {
        const value = row.getValue(metric);
        // Formatar valores percentuais
        if (metric.startsWith('percent_')) {
          return <div>{typeof value === 'number' ? `${value.toFixed(1)}%` : 'N/A'}</div>;
        }
        // Formatar valores monetários
        if (metric.includes('valor')) {
          return <div>{typeof value === 'number' ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/A'}</div>;
        }
        return <div>{typeof value === 'number' ? value.toLocaleString('pt-BR') : value || 'N/A'}</div>;
      }
    }))
  ];
  
  return <SimpleDataTable columns={columns} data={data} />;
}

function KPIView({ config, data }: WidgetContentProps) {
  // Para KPI, mostrar apenas o primeiro registro e primeira métrica
  const value = data[0]?.[config.metrics[0]];
  const metric = config.metrics[0];
  
  const formatValue = (val: number) => {
    if (metric.startsWith('percent_')) {
      return `${val.toFixed(1)}%`;
    }
    if (metric.includes('valor')) {
      return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
    return val.toLocaleString('pt-BR');
  };
  
  return (
    <div className="text-center py-8">
      <div className="text-5xl font-bold text-primary mb-2">
        {typeof value === 'number' ? formatValue(value) : 'N/A'}
      </div>
      <div className="text-sm text-muted-foreground">
        {METRIC_LABELS[metric]}
      </div>
    </div>
  );
}
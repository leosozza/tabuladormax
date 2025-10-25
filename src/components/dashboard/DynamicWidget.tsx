/**
 * Componente que renderiza um widget dinâmico baseado em sua configuração
 */

import { useQuery } from '@tanstack/react-query';
import { executeDashboardQuery } from '@/services/dashboardQueryService';
import type { DashboardWidget } from '@/types/dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DIMENSION_LABELS, METRIC_LABELS } from '@/types/dashboard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart3, LineChart as LineChartIcon, Table2, PieChart, FileText, AreaChart } from 'lucide-react';
import { ApexBarChart } from './charts/ApexBarChart';
import { ApexLineChart } from './charts/ApexLineChart';
import { ApexAreaChart } from './charts/ApexAreaChart';
import { ApexPieChart } from './charts/ApexPieChart';
import { ApexDonutChart } from './charts/ApexDonutChart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DynamicWidgetProps {
  config: DashboardWidget;
  onEdit?: (widget: DashboardWidget) => void;
  onDelete?: (widgetId: string) => void;
}

export function DynamicWidget({ config, onEdit, onDelete }: DynamicWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-widget', config.id, config],
    queryFn: () => executeDashboardQuery(config),
    refetchInterval: config.refreshInterval || 60000 // Atualizar a cada 1 minuto por padrão
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
      default: return null;
    }
  };
  
  const renderChart = () => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Nenhum dado disponível
        </div>
      );
    }

    // Preparar dados para gráficos
    const categories = data.map(d => String(d[config.dimension]));
    
    switch (config.chartType) {
      case 'bar':
      case 'line':
      case 'area': {
        const series = config.metrics.map(metric => ({
          name: METRIC_LABELS[metric],
          data: data.map(d => Number(d[metric]) || 0)
        }));
        
        if (config.chartType === 'bar') {
          return <ApexBarChart title="" categories={categories} series={series} height={300} />;
        } else if (config.chartType === 'line') {
          return <ApexLineChart title="" categories={categories} series={series} height={300} />;
        } else {
          return <ApexAreaChart title="" categories={categories} series={series} height={300} />;
        }
      }
      
      case 'pie':
      case 'donut': {
        // Para pie/donut, usar apenas a primeira métrica
        const metric = config.metrics[0];
        const series = data.map(d => Number(d[metric]) || 0);
        
        if (config.chartType === 'pie') {
          return <ApexPieChart title="" labels={categories} series={series} height={300} />;
        } else {
          return <ApexDonutChart title="" labels={categories} series={series} height={300} />;
        }
      }
      
      case 'table':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{DIMENSION_LABELS[config.dimension]}</TableHead>
                {config.metrics.map(metric => (
                  <TableHead key={metric} className="text-right">
                    {METRIC_LABELS[metric]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{String(row[config.dimension])}</TableCell>
                  {config.metrics.map(metric => (
                    <TableCell key={metric} className="text-right">
                      {typeof row[metric] === 'number' 
                        ? row[metric].toFixed(2)
                        : row[metric]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );
      
      case 'kpi_card': {
        // Para KPI card, mostrar soma/média da primeira métrica
        const metric = config.metrics[0];
        const total = data.reduce((sum, d) => sum + (Number(d[metric]) || 0), 0);
        const avg = data.length > 0 ? total / data.length : 0;
        
        return (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="text-5xl font-bold text-primary mb-2">
              {total.toFixed(0)}
            </div>
            <div className="text-sm text-muted-foreground">
              {METRIC_LABELS[metric]}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Média: {avg.toFixed(2)}
            </div>
          </div>
        );
      }
      
      default:
        return <div>Tipo de gráfico não suportado</div>;
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
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar dados: {error instanceof Error ? error.message : 'Erro desconhecido'}
            </AlertDescription>
          </Alert>
        )}
        
        {!isLoading && !error && renderChart()}
      </CardContent>
    </Card>
  );
}

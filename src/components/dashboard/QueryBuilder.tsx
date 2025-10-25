/**
 * Query Builder - Interface visual para criar widgets dinamicamente
 * Permite selecionar dimensões, métricas, filtros e tipo de visualização
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import type {
  DashboardWidget,
  DimensionType,
  MetricType,
  ChartType,
  DateGrouping,
  WidgetFilters,
} from '@/types/dashboard';
import {
  DIMENSION_LABELS,
  METRIC_LABELS,
  CHART_TYPE_LABELS,
} from '@/types/dashboard';
import { Calendar, Filter, BarChart3, Settings2, Plus } from 'lucide-react';

interface QueryBuilderProps {
  onSave: (widget: Omit<DashboardWidget, 'id'>) => void;
  onCancel: () => void;
  initialWidget?: DashboardWidget;
}

export function QueryBuilder({ onSave, onCancel, initialWidget }: QueryBuilderProps) {
  const [title, setTitle] = useState(initialWidget?.title || '');
  const [subtitle, setSubtitle] = useState(initialWidget?.subtitle || '');
  const [dimension, setDimension] = useState<DimensionType>(initialWidget?.dimension || 'scouter');
  const [metrics, setMetrics] = useState<MetricType[]>(initialWidget?.metrics || ['count_distinct_id']);
  const [chartType, setChartType] = useState<ChartType>(initialWidget?.chartType || 'bar');
  const [dateGrouping, setDateGrouping] = useState<DateGrouping | undefined>(initialWidget?.dateGrouping);
  const [limit, setLimit] = useState<number>(initialWidget?.limit || 10);
  const [sortBy, setSortBy] = useState<MetricType | undefined>(initialWidget?.sortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialWidget?.sortOrder || 'desc');
  
  // Filtros
  const [filters, setFilters] = useState<WidgetFilters>(initialWidget?.filters || {});

  const handleMetricToggle = (metric: MetricType) => {
    setMetrics(prev => 
      prev.includes(metric)
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    );
  };

  const handleSave = () => {
    const widget: Omit<DashboardWidget, 'id'> = {
      title,
      subtitle,
      dimension,
      metrics,
      chartType,
      filters,
      dateGrouping: dimension === 'data' ? dateGrouping : undefined,
      limit,
      sortBy,
      sortOrder,
    };
    onSave(widget);
  };

  const isValid = title && dimension && metrics.length > 0 && chartType;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          {initialWidget ? 'Editar Widget' : 'Novo Widget'}
        </CardTitle>
        <CardDescription>
          Configure as dimensões, métricas e visualização do seu widget
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">
              <Settings2 className="w-4 h-4 mr-2" />
              Básico
            </TabsTrigger>
            <TabsTrigger value="data">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dados
            </TabsTrigger>
            <TabsTrigger value="filters">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </TabsTrigger>
            <TabsTrigger value="advanced">
              <Calendar className="w-4 h-4 mr-2" />
              Avançado
            </TabsTrigger>
          </TabsList>

          {/* Aba Básico */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Leads por Scouter"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtítulo</Label>
              <Input
                id="subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Ex: Últimos 30 dias"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="chartType">Tipo de Visualização *</Label>
              <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                <SelectTrigger id="chartType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CHART_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* Aba Dados */}
          <TabsContent value="data" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="dimension">Dimensão (Agrupar por) *</Label>
              <Select value={dimension} onValueChange={(v) => setDimension(v as DimensionType)}>
                <SelectTrigger id="dimension">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DIMENSION_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {dimension === 'data' && (
              <div className="space-y-2">
                <Label htmlFor="dateGrouping">Agrupamento de Data</Label>
                <Select 
                  value={dateGrouping} 
                  onValueChange={(v) => setDateGrouping(v as DateGrouping)}
                >
                  <SelectTrigger id="dateGrouping">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Dia</SelectItem>
                    <SelectItem value="week">Semana</SelectItem>
                    <SelectItem value="month">Mês</SelectItem>
                    <SelectItem value="quarter">Trimestre</SelectItem>
                    <SelectItem value="year">Ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Métricas *</Label>
              <ScrollArea className="h-64 border rounded-md p-4">
                <div className="space-y-3">
                  {Object.entries(METRIC_LABELS).map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={key}
                        checked={metrics.includes(key as MetricType)}
                        onCheckedChange={() => handleMetricToggle(key as MetricType)}
                      />
                      <Label htmlFor={key} className="cursor-pointer font-normal">
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                Selecione uma ou mais métricas para visualizar
              </p>
            </div>
          </TabsContent>

          {/* Aba Filtros */}
          <TabsContent value="filters" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="dataInicio">Data Início</Label>
              <Input
                id="dataInicio"
                type="date"
                value={filters.dataInicio || ''}
                onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataFim">Data Fim</Label>
              <Input
                id="dataFim"
                type="date"
                value={filters.dataFim || ''}
                onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              💡 Dica: Filtros adicionais (scouter, projeto, etc.) podem ser adicionados futuramente
            </p>
          </TabsContent>

          {/* Aba Avançado */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="limit">Limite de Resultados</Label>
              <Input
                id="limit"
                type="number"
                min="1"
                max="100"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 10)}
              />
              <p className="text-xs text-muted-foreground">
                Número máximo de itens a exibir (1-100)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortBy">Ordenar Por</Label>
              <Select 
                value={sortBy || ''} 
                onValueChange={(v) => setSortBy(v ? v as MetricType : undefined)}
              >
                <SelectTrigger id="sortBy">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {metrics.map(metric => (
                    <SelectItem key={metric} value={metric}>
                      {METRIC_LABELS[metric]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">Ordem</Label>
              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}>
                <SelectTrigger id="sortOrder">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Decrescente</SelectItem>
                  <SelectItem value="asc">Crescente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        {/* Botões de ação */}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {initialWidget ? 'Atualizar' : 'Criar'} Widget
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

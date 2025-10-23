/**
 * Modal para configurar widgets do dashboard
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import type { DashboardWidget, DimensionType, MetricType, ChartType, DateGrouping, CustomFormula } from '@/types/dashboard';
import { DIMENSION_LABELS, METRIC_LABELS, CHART_TYPE_LABELS, DATE_GROUPING_LABELS, COLOR_SCHEMES } from '@/types/dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FormulaBuilder } from './FormulaBuilder';
import { Badge } from '@/components/ui/badge';
import { Code, Plus, Trash2 } from 'lucide-react';

interface WidgetConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (widget: DashboardWidget) => void;
  initialWidget?: DashboardWidget;
}

export function WidgetConfigModal({ open, onOpenChange, onSave, initialWidget }: WidgetConfigModalProps) {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [dimension, setDimension] = useState<DimensionType>('scouter');
  const [metrics, setMetrics] = useState<MetricType[]>(['count_distinct_id']);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [dateGrouping, setDateGrouping] = useState<DateGrouping>('day');
  const [limit, setLimit] = useState<number | undefined>(undefined);
  
  // Advanced theme options
  const [showLegend, setShowLegend] = useState(true);
  const [legendPosition, setLegendPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom');
  const [colorScheme, setColorScheme] = useState<string>('default');
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  
  // Custom formula support
  const [customFormula, setCustomFormula] = useState<CustomFormula | undefined>();
  const [formulaBuilderOpen, setFormulaBuilderOpen] = useState(false);
  
  useEffect(() => {
    if (initialWidget) {
      setTitle(initialWidget.title);
      setSubtitle(initialWidget.subtitle || '');
      setDimension(initialWidget.dimension);
      setMetrics(initialWidget.metrics);
      setChartType(initialWidget.chartType);
      setDateGrouping(initialWidget.dateGrouping || 'day');
      setLimit(initialWidget.limit);
      setShowLegend(initialWidget.theme?.showLegend ?? true);
      setLegendPosition(initialWidget.theme?.legendPosition || 'bottom');
      setColorScheme('default');
      setShowGrid(initialWidget.theme?.showGrid ?? true);
      setShowLabels(initialWidget.theme?.showLabels ?? true);
      setCustomFormula(initialWidget.customFormula);
    } else {
      // Reset para valores padrão
      setTitle('');
      setSubtitle('');
      setDimension('scouter');
      setMetrics(['count_distinct_id']);
      setChartType('bar');
      setDateGrouping('day');
      setLimit(undefined);
      setShowLegend(true);
      setLegendPosition('bottom');
      setColorScheme('default');
      setShowGrid(true);
      setShowLabels(true);
      setCustomFormula(undefined);
    }
  }, [initialWidget, open]);
  
  const handleMetricToggle = (metric: MetricType, checked: boolean) => {
    if (checked) {
      setMetrics([...metrics, metric]);
    } else {
      setMetrics(metrics.filter(m => m !== metric));
    }
  };
  
  const handleSave = () => {
    const widget: DashboardWidget = {
      id: initialWidget?.id || `widget-${Date.now()}`,
      title: title || 'Novo Painel',
      subtitle: subtitle || undefined,
      dimension,
      metrics,
      chartType,
      dateGrouping: dimension === 'data' ? dateGrouping : undefined,
      limit,
      sortBy: metrics[0],
      sortOrder: 'desc',
      theme: {
        showLegend,
        legendPosition,
        colorScheme: COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES],
        showGrid,
        showLabels
      },
      customFormula
    };
    
    onSave(widget);
    onOpenChange(false);
  };
  
  const availableMetrics: MetricType[] = [
    'count_distinct_id',
    'count_all',
    'sum_valor_ficha',
    'avg_valor_ficha',
    'count_com_foto',
    'count_confirmadas',
    'count_agendadas',
    'count_compareceu',
    'percent_com_foto',
    'percent_confirmadas',
    'percent_compareceu'
  ];
  
  const availableChartTypes: ChartType[] = [
    'table', 'bar', 'line', 'area', 'pie', 'donut', 
    'kpi_card', 'radar', 'funnel', 'gauge', 'heatmap', 
    'pivot', 'scatter', 'treemap'
  ];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialWidget ? 'Editar Painel' : 'Criar Novo Painel'}</DialogTitle>
          <DialogDescription>
            Configure as dimensões, métricas e visualização do seu painel
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="basic" className="mt-4">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="basic">Configuração Básica</TabsTrigger>
            <TabsTrigger value="visual">Aparência</TabsTrigger>
            <TabsTrigger value="formula">Fórmula</TabsTrigger>
            <TabsTrigger value="advanced">Avançado</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[500px] pr-4">
            <TabsContent value="basic" className="space-y-4 mt-4">
              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="title">Título do Painel</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Desempenho por Scouter"
                />
              </div>
              
              {/* Subtítulo */}
              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtítulo (opcional)</Label>
                <Input
                  id="subtitle"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Ex: Últimos 30 dias"
                />
              </div>
              
              {/* Dimensão */}
              <div className="space-y-2">
                <Label htmlFor="dimension">Agrupar por:</Label>
                <Select value={dimension} onValueChange={(val) => setDimension(val as DimensionType)}>
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
              
              {/* Agrupamento de Data */}
              {dimension === 'data' && (
                <div className="space-y-2">
                  <Label htmlFor="dateGrouping">Agrupar data por:</Label>
                  <Select value={dateGrouping} onValueChange={(val) => setDateGrouping(val as DateGrouping)}>
                    <SelectTrigger id="dateGrouping">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DATE_GROUPING_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Métricas */}
              <div className="space-y-2">
                <Label>Métricas:</Label>
                <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto border rounded-md p-3">
                  {availableMetrics.map(metric => (
                    <div key={metric} className="flex items-center space-x-2">
                      <Checkbox
                        id={metric}
                        checked={metrics.includes(metric)}
                        onCheckedChange={(checked) => handleMetricToggle(metric, checked as boolean)}
                      />
                      <Label
                        htmlFor={metric}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {METRIC_LABELS[metric]}
                      </Label>
                    </div>
                  ))}
                </div>
                {metrics.length === 0 && (
                  <p className="text-sm text-destructive">Selecione pelo menos uma métrica</p>
                )}
              </div>
              
              {/* Tipo de Gráfico */}
              <div className="space-y-2">
                <Label>Tipo de Visualização:</Label>
                <RadioGroup value={chartType} onValueChange={(val) => setChartType(val as ChartType)}>
                  <div className="grid grid-cols-2 gap-3">
                    {availableChartTypes.map(type => (
                      <div key={type} className="flex items-center space-x-2">
                        <RadioGroupItem value={type} id={type} />
                        <Label htmlFor={type} className="font-normal cursor-pointer">
                          {CHART_TYPE_LABELS[type]}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            </TabsContent>
            
            <TabsContent value="visual" className="space-y-4 mt-4">
              <h3 className="font-semibold text-sm">Personalização Visual</h3>
              <Separator />
              
              {/* Paleta de Cores */}
              <div className="space-y-2">
                <Label htmlFor="colorScheme">Esquema de Cores:</Label>
                <Select value={colorScheme} onValueChange={setColorScheme}>
                  <SelectTrigger id="colorScheme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Padrão</SelectItem>
                    <SelectItem value="blues">Azuis</SelectItem>
                    <SelectItem value="greens">Verdes</SelectItem>
                    <SelectItem value="warm">Quentes</SelectItem>
                    <SelectItem value="cool">Frias</SelectItem>
                    <SelectItem value="vibrant">Vibrante</SelectItem>
                    <SelectItem value="professional">Profissional</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Preview de cores */}
                <div className="flex gap-1 mt-2">
                  {COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES]?.slice(0, 8).map((color, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
              
              {/* Mostrar Legenda */}
              {!['kpi_card', 'gauge', 'table', 'pivot'].includes(chartType) && (
                <>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showLegend">Mostrar Legenda</Label>
                    <Switch
                      id="showLegend"
                      checked={showLegend}
                      onCheckedChange={setShowLegend}
                    />
                  </div>
                  
                  {showLegend && (
                    <div className="space-y-2">
                      <Label htmlFor="legendPosition">Posição da Legenda:</Label>
                      <Select value={legendPosition} onValueChange={(val) => setLegendPosition(val as any)}>
                        <SelectTrigger id="legendPosition">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top">Topo</SelectItem>
                          <SelectItem value="bottom">Rodapé</SelectItem>
                          <SelectItem value="left">Esquerda</SelectItem>
                          <SelectItem value="right">Direita</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}
              
              {/* Mostrar Grade */}
              {['bar', 'line', 'area', 'scatter'].includes(chartType) && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="showGrid">Mostrar Grade</Label>
                  <Switch
                    id="showGrid"
                    checked={showGrid}
                    onCheckedChange={setShowGrid}
                  />
                </div>
              )}
              
              {/* Mostrar Rótulos */}
              <div className="flex items-center justify-between">
                <Label htmlFor="showLabels">Mostrar Rótulos</Label>
                <Switch
                  id="showLabels"
                  checked={showLabels}
                  onCheckedChange={setShowLabels}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="formula" className="space-y-4 mt-4">
              <h3 className="font-semibold text-sm">Fórmula Personalizada</h3>
              <Separator />
              
              {customFormula ? (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        <span className="font-semibold">{customFormula.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCustomFormula(undefined)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {customFormula.description && (
                      <p className="text-sm text-muted-foreground">
                        {customFormula.description}
                      </p>
                    )}
                    <code className="block text-xs bg-background p-2 rounded border">
                      {customFormula.expression}
                    </code>
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => setFormulaBuilderOpen(true)}
                    className="w-full"
                  >
                    <Code className="mr-2 h-4 w-4" />
                    Editar Fórmula
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-8 space-y-4">
                    <Code className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <h4 className="font-semibold mb-1">Nenhuma fórmula personalizada</h4>
                      <p className="text-sm text-muted-foreground">
                        Crie uma fórmula para calcular métricas customizadas
                      </p>
                    </div>
                    <Button
                      onClick={() => setFormulaBuilderOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Criar Fórmula
                    </Button>
                  </div>
                  
                  <div className="p-4 bg-muted rounded-md space-y-2">
                    <p className="text-sm font-semibold">Exemplos de fórmulas:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li><code>PERCENT(COUNT_DISTINCT(id), COUNT(*))</code> - Taxa de conversão</li>
                      <li><code>DIVIDE(SUM(valor_ficha), COUNT(*))</code> - Ticket médio</li>
                      <li><code>MULTIPLY(AVG(valor_ficha), 1.1)</code> - Média com acréscimo</li>
                    </ul>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="advanced" className="space-y-4 mt-4">
              <h3 className="font-semibold text-sm">Configurações Avançadas</h3>
              <Separator />
              
              {/* Limite de Resultados */}
              <div className="space-y-2">
                <Label htmlFor="limit">Limitar resultados (opcional)</Label>
                <Input
                  id="limit"
                  type="number"
                  value={limit || ''}
                  onChange={(e) => setLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Ex: 10 (para mostrar top 10)"
                  min={1}
                />
                <p className="text-xs text-muted-foreground">
                  Deixe vazio para mostrar todos os resultados
                </p>
              </div>
              
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  💡 <strong>Dica:</strong> Para gráficos de funil e gauge, use métricas que representem 
                  etapas de conversão ou valores de progresso.
                </p>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={metrics.length === 0}>
            {initialWidget ? 'Atualizar' : 'Criar'} Painel
          </Button>
        </DialogFooter>
      </DialogContent>
      
      {/* Formula Builder Dialog */}
      <FormulaBuilder
        open={formulaBuilderOpen}
        onOpenChange={setFormulaBuilderOpen}
        onSave={(formula) => {
          setCustomFormula(formula);
          setFormulaBuilderOpen(false);
        }}
        initialFormula={customFormula}
        availableFields={['id', 'valor_ficha', 'scouter', 'projeto', 'data']}
      />
    </Dialog>
  );
}

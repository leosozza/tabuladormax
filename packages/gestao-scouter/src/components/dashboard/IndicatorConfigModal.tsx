import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import type { IndicatorConfig, IndicatorFilterCondition } from '@/types/indicator';
import type { Lead } from '@/repositories/types';

interface IndicatorConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: IndicatorConfig | null;
  onSave: (config: Partial<IndicatorConfig>) => void;
  availableColumns: string[];
  data: Lead[];
  isCreating?: boolean;
}

export function IndicatorConfigModal({
  open,
  onOpenChange,
  config,
  onSave,
  availableColumns,
  data,
  isCreating = false,
}: IndicatorConfigModalProps) {
  const [title, setTitle] = useState('');
  const [sourceColumn, setSourceColumn] = useState('');
  const [aggregation, setAggregation] = useState<IndicatorConfig['aggregation']>('count');
  const [chartType, setChartType] = useState<IndicatorConfig['chart_type']>('number');
  const [format, setFormat] = useState<IndicatorConfig['format']>('number');
  const [filters, setFilters] = useState<IndicatorFilterCondition>({});
  const [color, setColor] = useState('#3b82f6');

  // Get unique values for filters
  const scouterOptions = Array.from(new Set(data.map(d => d.scouter).filter(Boolean)));
  const projectOptions = Array.from(new Set(data.map(d => d.projetos).filter(Boolean)));
  const stageOptions = Array.from(new Set(data.map(d => d.etapa).filter(Boolean)));

  useEffect(() => {
    if (config) {
      setTitle(config.title);
      setSourceColumn(config.source_column);
      setAggregation(config.aggregation);
      setChartType(config.chart_type);
      setFormat(config.format);
      setFilters(config.filter_condition || {});
      setColor(config.color || '#3b82f6');
    }
  }, [config]);

  const handleSave = () => {
    if (!config) return;
    if (!title.trim() || !sourceColumn) {
      return;
    }

    const hasFilters = Object.keys(filters).length > 0 && 
      Object.values(filters).some(v => v && (Array.isArray(v) ? v.length > 0 : true));

    onSave({
      id: config.id,
      indicator_key: config.indicator_key,
      title,
      source_column: sourceColumn,
      aggregation,
      chart_type: chartType,
      format,
      position: config.position,
      filter_condition: hasFilters ? filters : undefined,
      color,
    });

    onOpenChange(false);
  };

  const toggleFilterItem = (filterKey: keyof IndicatorFilterCondition, value: string) => {
    setFilters(prev => {
      const currentArray = (prev[filterKey] as string[]) || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(v => v !== value)
        : [...currentArray, value];
      
      return {
        ...prev,
        [filterKey]: newArray.length > 0 ? newArray : undefined,
      };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isCreating ? 'Criar Novo Indicador' : 'Configurar Indicador'}</DialogTitle>
          <DialogDescription>
            Configure as propriedades do indicador e aplique filtros opcionais
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do indicador"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="column">Coluna de Dados</Label>
            <Select value={sourceColumn} onValueChange={setSourceColumn}>
              <SelectTrigger id="column">
                <SelectValue placeholder="Selecione a coluna" />
              </SelectTrigger>
              <SelectContent>
                {availableColumns.map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aggregation">Função de Agregação</Label>
            <Select value={aggregation} onValueChange={(v) => setAggregation(v as any)}>
              <SelectTrigger id="aggregation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="count">Contar</SelectItem>
                <SelectItem value="count_distinct">Contar Únicos</SelectItem>
                <SelectItem value="sum">Somar</SelectItem>
                <SelectItem value="avg">Média</SelectItem>
                <SelectItem value="min">Mínimo</SelectItem>
                <SelectItem value="max">Máximo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chartType">Tipo de Visualização</Label>
            <Select value={chartType} onValueChange={(v) => setChartType(v as any)}>
              <SelectTrigger id="chartType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="number">Número</SelectItem>
                <SelectItem value="bar">Gráfico de Barras</SelectItem>
                <SelectItem value="line">Gráfico de Linha</SelectItem>
                <SelectItem value="pie">Gráfico de Pizza</SelectItem>
                <SelectItem value="donut">Gráfico de Rosca</SelectItem>
                <SelectItem value="progress">Barra de Progresso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="format">Formato</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as any)}>
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="number">Número</SelectItem>
                <SelectItem value="currency">Moeda (R$)</SelectItem>
                <SelectItem value="percentage">Porcentagem (%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {chartType !== 'number' && (
            <div className="space-y-2">
              <Label htmlFor="color">Cor Principal</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-20 h-10"
                />
                <span className="text-sm text-muted-foreground">{color}</span>
              </div>
            </div>
          )}

          {/* Advanced Filters */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="filters">
              <AccordionTrigger className="text-sm">
                Filtros Avançados (Opcional)
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                {/* Date Filter */}
                <div className="space-y-2">
                  <Label htmlFor="dateFilter">Filtro de Data</Label>
                  <Select 
                    value={filters.date_filter || 'none'} 
                    onValueChange={(v) => setFilters(prev => ({
                      ...prev,
                      date_filter: v === 'none' ? undefined : v as any
                    }))}
                  >
                    <SelectTrigger id="dateFilter">
                      <SelectValue placeholder="Sem filtro de data" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem filtro</SelectItem>
                      <SelectItem value="today">Hoje</SelectItem>
                      <SelectItem value="week">Última semana</SelectItem>
                      <SelectItem value="month">Último mês</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Scouter Filter */}
                {scouterOptions.length > 0 && (
                  <div className="space-y-2">
                    <Label>Filtrar por Scouter</Label>
                    <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-2">
                      {scouterOptions.slice(0, 10).map((scouter) => (
                        <div key={scouter} className="flex items-center space-x-2">
                          <Checkbox
                            id={`scouter-${scouter}`}
                            checked={(filters.scouter || []).includes(scouter)}
                            onCheckedChange={() => toggleFilterItem('scouter', scouter)}
                          />
                          <label
                            htmlFor={`scouter-${scouter}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {scouter}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Project Filter */}
                {projectOptions.length > 0 && (
                  <div className="space-y-2">
                    <Label>Filtrar por Projeto</Label>
                    <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-2">
                      {projectOptions.slice(0, 10).map((project) => (
                        <div key={project} className="flex items-center space-x-2">
                          <Checkbox
                            id={`project-${project}`}
                            checked={(filters.projeto || []).includes(project)}
                            onCheckedChange={() => toggleFilterItem('projeto', project)}
                          />
                          <label
                            htmlFor={`project-${project}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {project}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stage Filter */}
                {stageOptions.length > 0 && (
                  <div className="space-y-2">
                    <Label>Filtrar por Etapa</Label>
                    <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-2">
                      {stageOptions.slice(0, 10).map((stage) => (
                        <div key={stage} className="flex items-center space-x-2">
                          <Checkbox
                            id={`stage-${stage}`}
                            checked={(filters.etapa || []).includes(stage)}
                            onCheckedChange={() => toggleFilterItem('etapa', stage)}
                          />
                          <label
                            htmlFor={`stage-${stage}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {stage}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!title.trim() || !sourceColumn}
          >
            {isCreating ? 'Criar' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

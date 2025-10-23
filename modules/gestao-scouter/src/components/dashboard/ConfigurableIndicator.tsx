import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { IndicatorConfig } from '@/types/indicator';
import type { Lead } from '@/repositories/types';
import { ChartIndicator } from './indicators/ChartIndicator';
import { ProgressIndicator } from './indicators/ProgressIndicator';

interface ConfigurableIndicatorProps {
  config: IndicatorConfig;
  value: number | string;
  data?: Lead[];
  onEdit: () => void;
  onDelete?: () => void;
}

export function ConfigurableIndicator({ config, value, data = [], onEdit, onDelete }: ConfigurableIndicatorProps) {
  const formatValue = (val: number | string) => {
    const numValue = typeof val === 'string' ? parseFloat(val) : val;
    
    switch (config.format) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(numValue);
      case 'percentage':
        return `${numValue.toFixed(1)}%`;
      default:
        return new Intl.NumberFormat('pt-BR').format(numValue);
    }
  };

  return (
    <TooltipProvider>
      <Card 
        className="relative group cursor-pointer hover:shadow-lg transition-all"
        onDoubleClick={onEdit}
      >
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Editar indicador</TooltipContent>
          </Tooltip>

          {onDelete && (
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-destructive/10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Remover indicador</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover Indicador?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja remover o indicador "{config.title}"? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {config.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {config.chart_type === 'number' ? (
                  <div>
                    <div className="text-3xl font-bold">{formatValue(value)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {config.aggregation === 'count' && 'Total de registros'}
                      {config.aggregation === 'count_distinct' && 'Valores únicos'}
                      {config.aggregation === 'sum' && 'Soma total'}
                      {config.aggregation === 'avg' && 'Média'}
                      {config.aggregation === 'min' && 'Valor mínimo'}
                      {config.aggregation === 'max' && 'Valor máximo'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Coluna: <span className="font-mono">{config.source_column}</span>
                    </p>
                  </div>
                ) : config.chart_type === 'progress' ? (
                  <ProgressIndicator config={config} value={typeof value === 'number' ? value : parseFloat(String(value))} />
                ) : (
                  <ChartIndicator config={config} data={data} />
                )}
              </CardContent>
            </div>
          </TooltipTrigger>
          <TooltipContent>Duplo clique para editar</TooltipContent>
        </Tooltip>
      </Card>
    </TooltipProvider>
  );
}

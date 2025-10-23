import { Progress } from '@/components/ui/progress';
import type { IndicatorConfig } from '@/types/indicator';

interface ProgressIndicatorProps {
  config: IndicatorConfig;
  value: number;
  maxValue?: number;
}

export function ProgressIndicator({ config, value, maxValue = 100 }: ProgressIndicatorProps) {
  const percentage = (value / maxValue) * 100;

  const formatValue = (val: number) => {
    switch (config.format) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return new Intl.NumberFormat('pt-BR').format(val);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold">{formatValue(value)}</span>
        <span className="text-sm text-muted-foreground">
          de {formatValue(maxValue)}
        </span>
      </div>
      <Progress value={percentage} className="h-3" />
      <p className="text-xs text-muted-foreground text-center">
        {percentage.toFixed(1)}% da meta
      </p>
    </div>
  );
}

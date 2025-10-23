// Metric Card com comparação período anterior (Looker style)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MetricCardProps {
  title: string;
  value: string | number;
  previousValue?: string | number;
  icon?: LucideIcon;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  format?: 'number' | 'currency' | 'percentage';
  colorScheme?: 'primary' | 'success' | 'warning' | 'destructive';
}

export function MetricCard({
  title,
  value,
  previousValue,
  icon: Icon,
  description,
  trend,
  trendValue,
  format = 'number',
  colorScheme = 'primary'
}: MetricCardProps) {
  // Calcular trend automaticamente se previousValue fornecido
  const calculatedTrend = previousValue !== undefined && !trend
    ? Number(value) > Number(previousValue) ? 'up' 
      : Number(value) < Number(previousValue) ? 'down' 
      : 'neutral'
    : trend;

  const calculatedTrendValue = previousValue !== undefined && !trendValue
    ? `${Math.abs(((Number(value) - Number(previousValue)) / Number(previousValue)) * 100).toFixed(1)}%`
    : trendValue;

  const TrendIcon = calculatedTrend === 'up' 
    ? TrendingUp 
    : calculatedTrend === 'down' 
    ? TrendingDown 
    : Minus;

  const trendColor = calculatedTrend === 'up'
    ? 'text-success'
    : calculatedTrend === 'down'
    ? 'text-destructive'
    : 'text-muted-foreground';

  const colorClasses = {
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive'
  };

  return (
    <Card className="rounded-2xl hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className={cn("h-4 w-4", colorClasses[colorScheme])} />}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-3xl font-bold tracking-tight">
            {formatValue(value, format)}
          </div>
          
          <div className="flex items-center gap-2">
            {calculatedTrendValue && (
              <Badge 
                variant="outline" 
                className={cn("gap-1 px-2 py-0.5", trendColor)}
              >
                <TrendIcon className="h-3 w-3" />
                {calculatedTrendValue}
              </Badge>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatValue(value: string | number, format: 'number' | 'currency' | 'percentage'): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(numValue);
    case 'percentage':
      return `${numValue.toFixed(1)}%`;
    case 'number':
    default:
      return new Intl.NumberFormat('pt-BR').format(numValue);
  }
}

/**
 * Componente de Gráfico de Funil
 * Útil para visualizar conversões e pipeline de vendas
 */

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface FunnelChartProps {
  data: Array<{
    stage: string;
    value: number;
    color?: string;
  }>;
  height?: number;
  showPercentages?: boolean;
  showValues?: boolean;
}

export function FunnelChart({ 
  data, 
  height = 400, 
  showPercentages = true,
  showValues = true 
}: FunnelChartProps) {
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value)), [data]);
  
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
  ];

  return (
    <div className="w-full" style={{ height }}>
      <div className="flex flex-col gap-1 h-full justify-center">
        {data.map((item, index) => {
          const widthPercent = (item.value / maxValue) * 100;
          const percentOfPrevious = index === 0 
            ? 100 
            : (item.value / data[index - 1].value) * 100;
          const color = item.color || colors[index % colors.length];
          
          return (
            <div key={item.stage} className="flex items-center gap-3">
              {/* Stage Label */}
              <div className="w-32 text-sm font-medium text-right flex-shrink-0">
                {item.stage}
              </div>
              
              {/* Funnel Bar */}
              <div className="flex-1 flex items-center">
                <div
                  className="relative transition-all duration-500 ease-out rounded-r-md"
                  style={{
                    width: `${widthPercent}%`,
                    height: '50px',
                    backgroundColor: color,
                    opacity: 0.9
                  }}
                >
                  {/* Value and Percentage Labels */}
                  <div className="absolute inset-0 flex items-center justify-center text-white font-semibold text-sm">
                    {showValues && (
                      <span>{item.value.toLocaleString('pt-BR')}</span>
                    )}
                    {showPercentages && showValues && (
                      <span className="mx-1">·</span>
                    )}
                    {showPercentages && (
                      <span>{percentOfPrevious.toFixed(1)}%</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Componente de Indicador Gauge (Velocímetro)
 * Útil para mostrar progresso em relação a uma meta
 */

import { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

interface GaugeChartProps {
  value: number;
  max?: number;
  min?: number;
  label?: string;
  unit?: string;
  height?: number;
  colors?: {
    low?: string;
    medium?: string;
    high?: string;
  };
  thresholds?: {
    medium?: number;
    high?: number;
  };
}

export function GaugeChart({
  value,
  max = 100,
  min = 0,
  label = 'Progresso',
  unit = '%',
  height = 300,
  colors = {
    low: '#ef4444',
    medium: '#f59e0b',
    high: '#10b981'
  },
  thresholds = {
    medium: 50,
    high: 80
  }
}: GaugeChartProps) {
  const [chartValue, setChartValue] = useState(0);

  useEffect(() => {
    // Animate value
    const timer = setTimeout(() => setChartValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  const percentage = ((chartValue - min) / (max - min)) * 100;
  
  const getColor = () => {
    if (percentage >= (thresholds.high || 80)) return colors.high;
    if (percentage >= (thresholds.medium || 50)) return colors.medium;
    return colors.low;
  };

  const options: ApexOptions = {
    chart: {
      type: 'radialBar',
      offsetY: -20,
      sparkline: {
        enabled: true
      }
    },
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        track: {
          background: '#e7e7e7',
          strokeWidth: '97%',
          margin: 5,
          dropShadow: {
            enabled: true,
            top: 2,
            left: 0,
            color: '#999',
            opacity: 1,
            blur: 2
          }
        },
        dataLabels: {
          name: {
            show: true,
            fontSize: '14px',
            fontWeight: 600,
            offsetY: -10,
            color: '#888'
          },
          value: {
            offsetY: -2,
            fontSize: '32px',
            fontWeight: 700,
            formatter: () => `${chartValue.toLocaleString('pt-BR')}${unit}`
          }
        }
      }
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'horizontal',
        shadeIntensity: 0.5,
        gradientToColors: [getColor()],
        inverseColors: true,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 100]
      }
    },
    labels: [label],
    colors: [getColor()]
  };

  return (
    <div className="w-full flex items-center justify-center">
      <Chart
        options={options}
        series={[percentage]}
        type="radialBar"
        height={height}
      />
    </div>
  );
}

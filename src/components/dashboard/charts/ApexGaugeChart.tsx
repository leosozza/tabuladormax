/**
 * Gráfico de Gauge (medidor) usando ApexCharts
 * Ideal para mostrar progresso, metas ou indicadores de performance
 */

import { useEffect, useRef } from 'react';
import ApexCharts from 'apexcharts';

interface ApexGaugeChartProps {
  title: string;
  value: number;
  max?: number;
  min?: number;
  colors?: string[];
  height?: number;
  showValue?: boolean;
  unit?: string;
}

export function ApexGaugeChart({
  title,
  value,
  max = 100,
  min = 0,
  colors = ['#008FFB'],
  height = 300,
  showValue = true,
  unit = '',
}: ApexGaugeChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<ApexCharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Calcular porcentagem
    const percentage = ((value - min) / (max - min)) * 100;

    const options: ApexCharts.ApexOptions = {
      chart: {
        type: 'radialBar',
        height: height,
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800,
        },
      },
      plotOptions: {
        radialBar: {
          startAngle: -135,
          endAngle: 135,
          hollow: {
            margin: 0,
            size: '70%',
            background: 'transparent',
          },
          track: {
            background: '#e7e7e7',
            strokeWidth: '97%',
            margin: 5,
          },
          dataLabels: {
            name: {
              show: true,
              fontSize: '16px',
              fontWeight: 600,
              offsetY: -10,
              color: '#888',
            },
            value: {
              show: showValue,
              fontSize: '30px',
              fontWeight: 'bold',
              offsetY: 16,
              color: '#111',
              formatter: function (val) {
                return value.toFixed(0) + unit;
              },
            },
          },
        },
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          type: 'horizontal',
          shadeIntensity: 0.5,
          gradientToColors: colors,
          inverseColors: true,
          opacityFrom: 1,
          opacityTo: 1,
          stops: [0, 100],
        },
      },
      stroke: {
        lineCap: 'round',
      },
      labels: [title],
      series: [percentage],
      colors: colors,
    };

    // Criar ou atualizar gráfico
    if (chartInstance.current) {
      chartInstance.current.updateOptions(options);
      chartInstance.current.updateSeries([percentage]);
    } else {
      chartInstance.current = new ApexCharts(chartRef.current, options);
      chartInstance.current.render();
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [title, value, max, min, colors, height, showValue, unit]);

  return <div ref={chartRef} />;
}

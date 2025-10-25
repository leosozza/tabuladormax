/**
 * Gráfico de Treemap usando ApexCharts
 * Ideal para visualizar hierarquias e proporções
 */

import { useEffect, useRef } from 'react';
import ApexCharts from 'apexcharts';

interface ApexTreemapChartProps {
  title: string;
  series: Array<{
    name: string;
    data: Array<{ x: string; y: number }>;
  }>;
  height?: number;
  distributed?: boolean;
}

export function ApexTreemapChart({
  title,
  series,
  height = 350,
  distributed = true,
}: ApexTreemapChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<ApexCharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const options: ApexCharts.ApexOptions = {
      chart: {
        type: 'treemap',
        height: height,
        toolbar: {
          show: true,
          tools: {
            download: true,
          },
        },
        animations: {
          enabled: true,
          speed: 800,
        },
      },
      title: {
        text: title,
        align: 'center',
        style: {
          fontSize: '16px',
          fontWeight: 600,
        },
      },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '12px',
        },
        formatter: function (text, op) {
          return [text, op.value];
        },
        offsetY: -4,
      },
      plotOptions: {
        treemap: {
          enableShades: true,
          shadeIntensity: 0.5,
          distributed: distributed,
          colorScale: {
            ranges: [
              {
                from: 0,
                to: 10,
                color: '#CD363A',
              },
              {
                from: 11,
                to: 50,
                color: '#FFC107',
              },
              {
                from: 51,
                to: 100,
                color: '#52B12C',
              },
            ],
          },
        },
      },
      legend: {
        show: true,
        position: 'bottom',
      },
      tooltip: {
        y: {
          formatter: function (val) {
            return val.toFixed(0);
          },
        },
      },
      series: series,
    };

    // Criar ou atualizar gráfico
    if (chartInstance.current) {
      chartInstance.current.updateOptions(options);
      chartInstance.current.updateSeries(series);
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
  }, [title, series, height, distributed]);

  return <div ref={chartRef} />;
}

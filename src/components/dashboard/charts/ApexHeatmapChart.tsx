/**
 * Gráfico de Heatmap usando ApexCharts
 * Ideal para mostrar densidade de dados e padrões
 */

import { useEffect, useRef } from 'react';
import ApexCharts from 'apexcharts';

interface ApexHeatmapChartProps {
  title: string;
  series: Array<{
    name: string;
    data: Array<{ x: string; y: number }>;
  }>;
  height?: number;
  colorScale?: {
    ranges: Array<{
      from: number;
      to: number;
      color: string;
      name: string;
    }>;
  };
}

export function ApexHeatmapChart({
  title,
  series,
  height = 350,
  colorScale,
}: ApexHeatmapChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<ApexCharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const options: ApexCharts.ApexOptions = {
      chart: {
        type: 'heatmap',
        height: height,
        toolbar: {
          show: true,
          tools: {
            download: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true,
          },
        },
        animations: {
          enabled: true,
          speed: 800,
        },
      },
      dataLabels: {
        enabled: true,
        style: {
          colors: ['#fff'],
        },
      },
      colors: colorScale ? undefined : ['#008FFB'],
      plotOptions: {
        heatmap: {
          shadeIntensity: 0.5,
          radius: 0,
          useFillColorAsStroke: true,
          colorScale: colorScale || {
            ranges: [
              {
                from: 0,
                to: 30,
                color: '#00A100',
                name: 'Baixo',
              },
              {
                from: 31,
                to: 70,
                color: '#FFB200',
                name: 'Médio',
              },
              {
                from: 71,
                to: 100,
                color: '#FF0000',
                name: 'Alto',
              },
            ],
          },
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
      xaxis: {
        type: 'category',
      },
      legend: {
        show: true,
        position: 'bottom',
      },
      tooltip: {
        y: {
          formatter: function (val) {
            return val.toFixed(1);
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
  }, [title, series, height, colorScale]);

  return <div ref={chartRef} />;
}

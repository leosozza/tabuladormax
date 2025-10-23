/**
 * Componente de Gráfico Radar usando ApexCharts
 */

import { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { Skeleton } from '@/components/ui/skeleton';

interface RadarChartProps {
  data: Record<string, number | string>[];
  categoryKey: string;
  valueKeys: string[];
  height?: number;
  colors?: string[];
  showLegend?: boolean;
  title?: string;
}

export function RadarChart({
  data,
  categoryKey,
  valueKeys,
  height = 350,
  colors = ['#3b82f6', '#10b981', '#f59e0b'],
  showLegend = true,
  title
}: RadarChartProps) {
  const [chartData, setChartData] = useState<{ categories: string[]; series: { name: string; data: number[] }[] }>({
    categories: [],
    series: []
  });

  useEffect(() => {
    if (!data || data.length === 0) return;

    const categories = data.map(item => String(item[categoryKey] || 'N/A'));
    
    const series = valueKeys.map(key => ({
      name: key,
      data: data.map(item => {
        const value = item[key];
        return typeof value === 'number' ? value : parseFloat(String(value)) || 0;
      })
    }));

    setChartData({ categories, series });
  }, [data, categoryKey, valueKeys]);

  const options: ApexOptions = {
    chart: {
      type: 'radar',
      toolbar: {
        show: true,
        tools: {
          download: true,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false
        }
      },
      animations: {
        enabled: true,
        speed: 800
      }
    },
    colors: colors,
    xaxis: {
      categories: chartData.categories,
      labels: {
        style: {
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      show: true,
      labels: {
        formatter: (val: number) => val.toFixed(0)
      }
    },
    legend: {
      show: showLegend,
      position: 'bottom'
    },
    title: title ? {
      text: title,
      align: 'center',
      style: {
        fontSize: '16px',
        fontWeight: 600
      }
    } : undefined,
    stroke: {
      width: 2
    },
    fill: {
      opacity: 0.2
    },
    markers: {
      size: 4,
      hover: {
        size: 6
      }
    },
    dataLabels: {
      enabled: false
    },
    tooltip: {
      y: {
        formatter: (val: number) => val.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
      }
    }
  };

  if (!chartData.series.length) {
    return <Skeleton className="h-full w-full" />;
  }

  return (
    <div className="w-full">
      <Chart
        options={options}
        series={chartData.series}
        type="radar"
        height={height}
      />
    </div>
  );
}

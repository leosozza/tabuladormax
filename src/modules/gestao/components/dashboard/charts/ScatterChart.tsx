/**
 * Scatter Chart Component
 * Displays correlation between two variables
 */

import { useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

interface ScatterChartProps {
  data: Array<{ x: number; y: number; label?: string }>;
  xLabel?: string;
  yLabel?: string;
  colors?: string[];
  height?: number;
  showLegend?: boolean;
  series?: Array<{ name: string; data: Array<{ x: number; y: number }> }>;
}

export function ScatterChart({ 
  data, 
  xLabel = 'X',
  yLabel = 'Y',
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
  height = 350,
  showLegend = true,
  series
}: ScatterChartProps) {
  
  const chartOptions: ApexOptions = useMemo(() => ({
    chart: {
      type: 'scatter',
      toolbar: {
        show: true,
        tools: {
          download: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      },
      fontFamily: 'inherit',
      zoom: {
        enabled: true,
        type: 'xy'
      }
    },
    colors: colors,
    legend: {
      show: showLegend,
      position: 'bottom',
      horizontalAlign: 'center',
    },
    xaxis: {
      title: {
        text: xLabel,
        style: {
          fontSize: '12px',
          fontWeight: 600
        }
      },
      labels: {
        formatter: function(value: any) {
          return typeof value === 'number' ? value.toLocaleString('pt-BR') : value;
        }
      }
    },
    yaxis: {
      title: {
        text: yLabel,
        style: {
          fontSize: '12px',
          fontWeight: 600
        }
      },
      labels: {
        formatter: function(value: number) {
          return value.toLocaleString('pt-BR');
        }
      }
    },
    grid: {
      show: true,
      borderColor: '#e5e7eb',
      strokeDashArray: 4,
      xaxis: {
        lines: {
          show: true
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      }
    },
    markers: {
      size: 6,
      hover: {
        size: 8
      }
    },
    tooltip: {
      enabled: true,
      shared: false,
      intersect: true,
      x: {
        show: true,
        formatter: function(value: number) {
          return `${xLabel}: ${value.toLocaleString('pt-BR')}`;
        }
      },
      y: {
        formatter: function(value: number) {
          return `${yLabel}: ${value.toLocaleString('pt-BR')}`;
        }
      }
    }
  }), [colors, showLegend, xLabel, yLabel]);

  const chartSeries = useMemo(() => {
    if (series && series.length > 0) {
      return series;
    }
    
    return [{
      name: 'Dados',
      data: data.map(item => ({
        x: item.x,
        y: item.y
      }))
    }];
  }, [data, series]);

  if (data.length === 0 && (!series || series.length === 0)) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Nenhum dado disponível
      </div>
    );
  }

  return (
    <div className="w-full">
      <ReactApexChart
        options={chartOptions}
        series={chartSeries}
        type="scatter"
        height={height}
      />
    </div>
  );
}

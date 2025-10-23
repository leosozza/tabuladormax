/**
 * Treemap Chart Component
 * Displays hierarchical data using nested rectangles
 */

import { useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

interface TreemapChartProps {
  data: Array<{ name: string; value: number; category?: string }>;
  colors?: string[];
  height?: number;
  showLegend?: boolean;
  distributed?: boolean;
}

export function TreemapChart({ 
  data, 
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'],
  height = 350,
  showLegend = true,
  distributed = true
}: TreemapChartProps) {
  
  const chartOptions: ApexOptions = useMemo(() => ({
    chart: {
      type: 'treemap',
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
      fontFamily: 'inherit',
    },
    colors: colors,
    legend: {
      show: showLegend,
      position: 'bottom',
      horizontalAlign: 'center',
    },
    plotOptions: {
      treemap: {
        distributed: distributed,
        enableShades: true,
        shadeIntensity: 0.5,
        reverseNegativeShade: true,
        colorScale: {
          ranges: distributed ? undefined : [
            {
              from: -100,
              to: 0,
              color: '#ef4444'
            },
            {
              from: 0,
              to: 100,
              color: '#10b981'
            }
          ]
        }
      }
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '12px',
        fontWeight: 'bold',
        colors: ['#fff']
      },
      formatter: function(text: string, op: any) {
        const value = op.value;
        return `${text}\n${value.toLocaleString('pt-BR')}`;
      }
    },
    tooltip: {
      enabled: true,
      y: {
        formatter: function(value: number) {
          return value.toLocaleString('pt-BR');
        }
      }
    }
  }), [colors, showLegend, distributed]);

  const series = useMemo(() => {
    return [{
      data: data.map(item => ({
        x: item.name,
        y: item.value
      }))
    }];
  }, [data]);

  if (data.length === 0) {
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
        series={series}
        type="treemap"
        height={height}
      />
    </div>
  );
}

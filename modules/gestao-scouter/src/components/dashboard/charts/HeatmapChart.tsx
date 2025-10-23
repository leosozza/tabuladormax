/**
 * Componente de Mapa de Calor usando ApexCharts
 */

import { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

interface HeatmapChartProps {
  data: Record<string, number | string>[];
  xKey: string;
  yKey: string;
  valueKey: string;
  height?: number;
  colorScale?: {
    min: string;
    max: string;
  };
  title?: string;
}

export function HeatmapChart({
  data,
  xKey,
  yKey,
  valueKey,
  height = 400,
  colorScale = {
    min: '#3b82f6',
    max: '#ef4444'
  },
  title
}: HeatmapChartProps) {
  const [chartData, setChartData] = useState<{ name: string; data: { x: string; y: number }[] }[]>([]);

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Group data by Y axis
    const groupedData: Record<string, { x: string; y: number }[]> = {};
    
    data.forEach(item => {
      const yValue = String(item[yKey] || 'N/A');
      const xValue = String(item[xKey] || 'N/A');
      const value = typeof item[valueKey] === 'number' 
        ? item[valueKey] 
        : parseFloat(String(item[valueKey])) || 0;

      if (!groupedData[yValue]) {
        groupedData[yValue] = [];
      }
      
      groupedData[yValue].push({ x: xValue, y: value });
    });

    const series = Object.entries(groupedData).map(([name, data]) => ({
      name,
      data
    }));

    setChartData(series);
  }, [data, xKey, yKey, valueKey]);

  const options: ApexOptions = {
    chart: {
      type: 'heatmap',
      toolbar: {
        show: true
      }
    },
    dataLabels: {
      enabled: false
    },
    colors: [colorScale.min],
    title: title ? {
      text: title,
      align: 'center',
      style: {
        fontSize: '16px',
        fontWeight: 600
      }
    } : undefined,
    xaxis: {
      labels: {
        rotate: -45,
        rotateAlways: true
      }
    },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.5,
        colorScale: {
          ranges: [
            {
              from: 0,
              to: 0,
              color: '#e2e8f0',
              name: 'Nenhum'
            }
          ]
        }
      }
    },
    tooltip: {
      y: {
        formatter: (val: number) => val.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
      }
    }
  };

  return (
    <div className="w-full">
      <Chart
        options={options}
        series={chartData}
        type="heatmap"
        height={height}
      />
    </div>
  );
}

import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import type { IndicatorConfig } from '@/types/indicator';
import type { Lead } from '@/repositories/types';
import { processChartData } from '@/utils/chartDataProcessors';

interface ChartIndicatorProps {
  config: IndicatorConfig;
  data: Lead[];
}

export function ChartIndicator({ config, data }: ChartIndicatorProps) {
  const processedData = processChartData(data, config);

  if (!processedData || processedData.series.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Sem dados disponíveis
      </div>
    );
  }

  const chartOptions: ApexOptions = {
    chart: {
      type: config.chart_type === 'line' ? 'line' : config.chart_type === 'bar' ? 'bar' : 'pie',
      toolbar: { show: false },
      background: 'transparent',
    },
    theme: {
      mode: 'light',
    },
    colors: config.color ? [config.color] : ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
    dataLabels: {
      enabled: true,
      formatter: (val: any) => {
        if (config.format === 'currency') {
          return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(Number(val));
        } else if (config.format === 'percentage') {
          return `${Number(val).toFixed(1)}%`;
        }
        return String(val);
      },
    },
    xaxis: {
      categories: processedData.categories,
      labels: {
        style: {
          colors: '#64748b',
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: '#64748b',
        },
        formatter: (val: number) => {
          if (config.format === 'currency') {
            return new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              minimumFractionDigits: 0,
            }).format(val);
          } else if (config.format === 'percentage') {
            return `${val.toFixed(1)}%`;
          }
          return val.toFixed(0);
        },
      },
    },
    legend: {
      position: 'bottom',
      labels: {
        colors: '#64748b',
      },
    },
    tooltip: {
      theme: 'light',
      y: {
        formatter: (val: number) => {
          if (config.format === 'currency') {
            return new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(val);
          } else if (config.format === 'percentage') {
            return `${val.toFixed(1)}%`;
          }
          return val.toFixed(0);
        },
      },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: false,
      },
      pie: {
        donut: {
          size: config.chart_type === 'donut' ? '60%' : '0%',
        },
      },
    },
  };

  return (
    <div className="w-full h-64">
      <ReactApexChart
        options={chartOptions}
        series={processedData.series}
        type={config.chart_type === 'line' ? 'line' : config.chart_type === 'bar' ? 'bar' : config.chart_type === 'donut' ? 'donut' : 'pie'}
        height="100%"
      />
    </div>
  );
}

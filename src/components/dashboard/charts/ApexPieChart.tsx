import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

interface ApexPieChartProps {
  title: string;
  labels: string[];
  series: number[];
  height?: number;
}

export function ApexPieChart({ title, labels, series, height = 350 }: ApexPieChartProps) {
  const total = series.reduce((sum, val) => sum + val, 0);
  
  const options: ApexOptions = {
    chart: {
      type: 'pie',
    },
    labels,
    colors: ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'],
    legend: {
      position: 'bottom',
      labels: {
        colors: 'hsl(var(--muted-foreground))',
      },
      formatter: (label: string, opts: { seriesIndex: number; w: { globals: { series: number[] } } }) => {
        const value = opts.w.globals.series[opts.seriesIndex];
        const percentage = ((value / total) * 100).toFixed(1);
        return `${label}: ${value} (${percentage}%)`;
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val.toFixed(1)}%`,
      style: {
        fontSize: '14px',
        fontWeight: 'bold'
      }
    },
    tooltip: {
      theme: 'light',
      y: {
        formatter: (val) => {
          const percentage = ((val / total) * 100).toFixed(1);
          return `${val} leads (${percentage}%)`;
        },
        title: {
          formatter: (seriesName) => `${seriesName}:`
        }
      }
    },
    plotOptions: {
      pie: {
        dataLabels: {
          offset: -5
        }
      }
    }
  };
  
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <span className="text-sm font-normal text-muted-foreground">Total: {total} leads</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Chart options={options} series={series} type="pie" height={height} />
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

interface ApexDonutChartProps {
  title: string;
  labels: string[];
  series: number[];
  height?: number;
}

export function ApexDonutChart({ title, labels, series, height = 350 }: ApexDonutChartProps) {
  const total = series.reduce((a, b) => a + b, 0);
  
  const options: ApexOptions = {
    chart: {
      type: 'donut',
    },
    labels,
    colors: ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'],
    legend: {
      position: 'bottom',
      labels: {
        colors: 'hsl(var(--muted-foreground))',
      },
      formatter: (label: string, opts: any) => {
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
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: '16px',
              fontWeight: 600,
              color: 'hsl(var(--foreground))'
            },
            value: {
              show: true,
              fontSize: '24px',
              fontWeight: 'bold',
              color: 'hsl(var(--foreground))',
              formatter: (val) => val.toString()
            },
            total: {
              show: true,
              label: 'Total de Leads',
              fontSize: '14px',
              fontWeight: 600,
              color: 'hsl(var(--muted-foreground))',
              formatter: () => `${total}`
            }
          }
        }
      }
    },
    tooltip: {
      theme: 'light',
      y: {
        formatter: (val, opts) => {
          const percentage = ((val / total) * 100).toFixed(1);
          return `${val} leads (${percentage}%)`;
        },
        title: {
          formatter: (seriesName) => `${seriesName}:`
        }
      }
    }
  };
  
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Chart options={options} series={series} type="donut" height={height} />
      </CardContent>
    </Card>
  );
}

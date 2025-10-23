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
  const options: ApexOptions = {
    chart: { type: 'donut' },
    labels,
    colors: ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'],
    legend: { 
      position: 'bottom',
      labels: {
        colors: 'hsl(var(--foreground))'
      }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              formatter: (w) => {
                const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                return total.toString();
              }
            }
          }
        }
      }
    },
    tooltip: {
      theme: 'light'
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

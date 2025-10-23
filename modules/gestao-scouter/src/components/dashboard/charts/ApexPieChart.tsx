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
  const options: ApexOptions = {
    chart: { type: 'pie' },
    labels,
    colors: ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'],
    legend: { 
      position: 'bottom',
      labels: {
        colors: 'hsl(var(--foreground))'
      }
    },
    dataLabels: {
      formatter: (val: any, opts: any) => {
        const numVal = typeof val === 'number' ? val : (Array.isArray(val) ? val[0] : parseFloat(String(val)));
        return `${opts.w.config.labels[opts.seriesIndex]}: ${numVal.toFixed(1)}%`;
      }
    },
    tooltip: {
      theme: 'light',
      y: { formatter: (val) => `${val} leads` }
    }
  };
  
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Chart options={options} series={series} type="pie" height={height} />
      </CardContent>
    </Card>
  );
}

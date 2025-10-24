import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

interface ApexAreaChartProps {
  title: string;
  categories: string[];
  series: { name: string; data: number[] }[];
  height?: number;
}

export function ApexAreaChart({ title, categories, series, height = 350 }: ApexAreaChartProps) {
  const options: ApexOptions = {
    chart: {
      type: 'area',
      toolbar: { show: true },
      animations: { enabled: true }
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
      }
    },
    xaxis: { 
      categories,
      labels: {
        style: {
          colors: 'hsl(var(--muted-foreground))',
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: 'hsl(var(--muted-foreground))',
        }
      }
    },
    colors: ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'],
    grid: {
      borderColor: 'hsl(var(--border))',
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
        <Chart options={options} series={series} type="area" height={height} />
      </CardContent>
    </Card>
  );
}

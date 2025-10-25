import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { useChartPerformance } from '@/lib/monitoring';

interface ApexLineChartProps {
  title: string;
  categories: string[];
  series: { name: string; data: number[] }[];
  height?: number;
}

export function ApexLineChart({ title, categories, series, height = 350 }: ApexLineChartProps) {
  // Calculate total data points
  const dataPoints = series.reduce((sum, s) => sum + s.data.length, 0);
  
  // Monitor chart performance
  useChartPerformance('apex', dataPoints, [series, categories]);
  const options: ApexOptions = {
    chart: {
      type: 'line',
      zoom: { enabled: true },
      toolbar: { show: true }
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3 },
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
    colors: ['hsl(var(--primary))', 'hsl(var(--chart-2))'],
    markers: { size: 5, hover: { size: 7 } },
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
        <Chart options={options} series={series} type="line" height={height} />
      </CardContent>
    </Card>
  );
}

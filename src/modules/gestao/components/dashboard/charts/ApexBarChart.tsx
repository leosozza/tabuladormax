import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

interface ApexBarChartProps {
  title: string;
  categories: string[];
  series: { name: string; data: number[] }[];
  height?: number;
}

export function ApexBarChart({ title, categories, series, height = 350 }: ApexBarChartProps) {
  const options: ApexOptions = {
    chart: {
      type: 'bar',
      toolbar: { 
        show: true, 
        tools: { 
          download: true, 
          zoom: true 
        } 
      },
      animations: { enabled: true, speed: 800 }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        borderRadius: 8
      }
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: { 
      categories,
      labels: {
        style: {
          colors: 'hsl(var(--muted-foreground))',
        }
      }
    },
    yaxis: { 
      title: { text: 'Quantidade' },
      labels: {
        style: {
          colors: 'hsl(var(--muted-foreground))',
        }
      }
    },
    fill: { opacity: 1 },
    tooltip: {
      theme: 'light',
      y: { formatter: (val) => `${val} leads` }
    },
    colors: ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'],
    grid: {
      borderColor: 'hsl(var(--border))',
      row: { colors: ['transparent', 'transparent'], opacity: 0.5 }
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Chart options={options} series={series} type="bar" height={height} />
      </CardContent>
    </Card>
  );
}

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
        borderRadius: 8,
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: { 
      enabled: true,
      offsetY: -20,
      style: {
        fontSize: '12px',
        colors: ['hsl(var(--foreground))']
      }
    },
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
      title: { 
        text: 'Quantidade',
        style: {
          color: 'hsl(var(--muted-foreground))',
        }
      },
      labels: {
        style: {
          colors: 'hsl(var(--muted-foreground))',
        },
        formatter: (val) => Math.floor(val).toString()
      }
    },
    fill: { opacity: 1 },
    tooltip: {
      theme: 'light',
      y: { 
        formatter: (val) => `${val} leads`,
        title: {
          formatter: (seriesName) => `${seriesName}:`
        }
      },
      x: {
        formatter: (val, opts) => {
          const category = categories[opts.dataPointIndex];
          return category ? `${category}` : '';
        }
      }
    },
    colors: ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'],
    grid: {
      borderColor: 'hsl(var(--border))',
      row: { colors: ['transparent', 'transparent'], opacity: 0.5 }
    },
    legend: {
      show: series.length > 1,
      position: 'top',
      horizontalAlign: 'center',
      labels: {
        colors: 'hsl(var(--muted-foreground))'
      }
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

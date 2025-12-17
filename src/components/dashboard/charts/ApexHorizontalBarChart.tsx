import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ApexHorizontalBarChartProps {
  title: string;
  categories: string[];
  series: number[];
  height?: number;
}

export function ApexHorizontalBarChart({ 
  title, 
  categories, 
  series, 
  height = 300 
}: ApexHorizontalBarChartProps) {
  const total = series.reduce((acc, val) => acc + val, 0);
  
  // Combine data for sorting
  const combinedData = categories.map((cat, idx) => ({
    category: cat,
    value: series[idx],
    percentage: total > 0 ? ((series[idx] / total) * 100).toFixed(1) : '0'
  })).sort((a, b) => b.value - a.value);

  const sortedCategories = combinedData.map(d => d.category);
  const sortedSeries = combinedData.map(d => d.value);

  const colors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(210, 70%, 55%)',
    'hsl(280, 60%, 55%)',
    'hsl(30, 80%, 55%)',
  ];

  const options: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      background: "transparent",
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        barHeight: '70%',
        distributed: true,
        dataLabels: {
          position: 'center'
        }
      },
    },
    colors: colors.slice(0, sortedCategories.length),
    dataLabels: {
      enabled: true,
      formatter: function(val: number, opts: any) {
        const percentage = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
        return `${val} (${percentage}%)`;
      },
      style: {
        fontSize: '12px',
        fontWeight: 600,
        colors: ['#fff']
      },
      dropShadow: {
        enabled: true,
        top: 1,
        left: 1,
        blur: 2,
        opacity: 0.5
      }
    },
    xaxis: {
      categories: sortedCategories,
      labels: {
        style: {
          colors: "hsl(var(--muted-foreground))",
          fontSize: "12px",
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: {
          colors: "hsl(var(--muted-foreground))",
          fontSize: "11px",
        },
        maxWidth: 180,
      },
    },
    grid: {
      borderColor: "hsl(var(--border))",
      strokeDashArray: 4,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
    },
    tooltip: {
      enabled: true,
      theme: "dark",
      y: {
        formatter: function(val: number) {
          const percentage = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
          return `${val} (${percentage}%)`;
        }
      }
    },
    legend: {
      show: false
    },
  };

  const chartSeries = [{
    name: 'Quantidade',
    data: sortedSeries
  }];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Chart 
          options={options} 
          series={chartSeries} 
          type="bar" 
          height={height} 
        />
      </CardContent>
    </Card>
  );
}

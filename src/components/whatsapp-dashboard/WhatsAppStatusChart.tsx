import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import type { StatusDistribution } from '@/hooks/useWhatsAppDashboardStats';

interface WhatsAppStatusChartProps {
  data: StatusDistribution | undefined;
  isLoading: boolean;
}

export function WhatsAppStatusChart({ data, isLoading }: WhatsAppStatusChartProps) {
  if (isLoading) {
    return (
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Status das Conversas</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const series = [data?.replied ?? 0, data?.waiting ?? 0, data?.never ?? 0];
  const labels = ['Respondidas', 'Aguardando', 'Nunca respondidas'];

  const options: ApexOptions = {
    chart: {
      type: 'donut',
      animations: { enabled: true, speed: 800 },
    },
    labels,
    colors: ['#22c55e', '#f59e0b', '#ef4444'],
    legend: {
      position: 'bottom',
      labels: { colors: 'hsl(var(--muted-foreground))' },
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
              formatter: () => {
                const total = (data?.replied ?? 0) + (data?.waiting ?? 0) + (data?.never ?? 0);
                return total.toLocaleString('pt-BR');
              },
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val.toFixed(1)}%`,
    },
    tooltip: {
      y: { formatter: (val) => `${val.toLocaleString('pt-BR')} conversas` },
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: { width: 280 },
          legend: { position: 'bottom' },
        },
      },
    ],
  };

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle>Status das Conversas</CardTitle>
      </CardHeader>
      <CardContent>
        <Chart options={options} series={series} type="donut" height={300} />
      </CardContent>
    </Card>
  );
}

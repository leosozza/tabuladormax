import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import type { HourlyDistribution } from '@/hooks/useWhatsAppDashboardStats';

interface WhatsAppHourlyChartProps {
  data: HourlyDistribution[] | undefined;
  isLoading: boolean;
}

export function WhatsAppHourlyChart({ data, isLoading }: WhatsAppHourlyChartProps) {
  if (isLoading) {
    return (
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Mensagens por Hora</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Fill all 24 hours
  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const found = data?.find((d) => d.hour === i);
    return { hour: i, count: found?.count ?? 0 };
  });

  const categories = hourlyData.map((d) => `${d.hour.toString().padStart(2, '0')}h`);
  const series = [{ name: 'Mensagens', data: hourlyData.map((d) => d.count) }];

  const options: ApexOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: true },
      animations: { enabled: true, speed: 800 },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '70%',
      },
    },
    xaxis: {
      categories,
      labels: {
        style: { colors: 'hsl(var(--muted-foreground))', fontSize: '10px' },
        rotate: -45,
      },
    },
    yaxis: {
      labels: {
        style: { colors: 'hsl(var(--muted-foreground))' },
        formatter: (val) => Math.floor(val).toLocaleString('pt-BR'),
      },
    },
    colors: ['hsl(var(--primary))'],
    grid: { borderColor: 'hsl(var(--border))' },
    tooltip: {
      theme: 'light',
      y: { formatter: (val) => `${val.toLocaleString('pt-BR')} mensagens` },
    },
    dataLabels: { enabled: false },
  };

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle>Mensagens Recebidas por Hora (7 dias)</CardTitle>
      </CardHeader>
      <CardContent>
        <Chart options={options} series={series} type="bar" height={300} />
      </CardContent>
    </Card>
  );
}

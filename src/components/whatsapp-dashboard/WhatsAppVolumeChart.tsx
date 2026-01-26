import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import type { DailyVolume } from '@/hooks/useWhatsAppDashboardStats';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WhatsAppVolumeChartProps {
  data: DailyVolume[] | undefined;
  isLoading: boolean;
}

export function WhatsAppVolumeChart({ data, isLoading }: WhatsAppVolumeChartProps) {
  if (isLoading) {
    return (
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Volume de Mensagens</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const sortedData = [...(data || [])].sort((a, b) => a.date.localeCompare(b.date));
  
  const categories = sortedData.map((d) => {
    try {
      return format(parseISO(d.date), 'dd/MM', { locale: ptBR });
    } catch {
      return d.date;
    }
  });

  const series = [
    {
      name: 'Recebidas',
      data: sortedData.map((d) => d.received),
    },
    {
      name: 'Enviadas',
      data: sortedData.map((d) => d.sent),
    },
  ];

  const options: ApexOptions = {
    chart: {
      type: 'line',
      toolbar: { show: true },
      animations: { enabled: true, speed: 800 },
    },
    stroke: { curve: 'smooth', width: 3 },
    xaxis: {
      categories,
      labels: {
        style: { colors: 'hsl(var(--muted-foreground))' },
      },
    },
    yaxis: {
      labels: {
        style: { colors: 'hsl(var(--muted-foreground))' },
        formatter: (val) => Math.floor(val).toLocaleString('pt-BR'),
      },
    },
    colors: ['hsl(var(--primary))', 'hsl(var(--chart-2))'],
    markers: { size: 5, hover: { size: 7 } },
    grid: { borderColor: 'hsl(var(--border))' },
    tooltip: {
      theme: 'light',
      y: { formatter: (val) => `${val.toLocaleString('pt-BR')} mensagens` },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'center',
      labels: { colors: 'hsl(var(--muted-foreground))' },
    },
  };

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle>Volume de Mensagens (7 dias)</CardTitle>
      </CardHeader>
      <CardContent>
        <Chart options={options} series={series} type="line" height={300} />
      </CardContent>
    </Card>
  );
}

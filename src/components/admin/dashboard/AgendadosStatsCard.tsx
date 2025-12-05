/**
 * Agendados Statistics Card
 * Shows scheduled leads count and percentage with progress bar
 * Uses dateFilter prop to filter by data_criacao_agendamento date
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CalendarCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateFilterValue } from '@/components/MinimalDateFilter';

interface AgendadosStatsCardProps {
  dateFilter: DateFilterValue;
}

export function AgendadosStatsCard({ dateFilter }: AgendadosStatsCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['agendados-stats-dashboard', dateFilter.startDate?.toISOString(), dateFilter.endDate?.toISOString()],
    queryFn: async () => {
      const startDate = dateFilter.startDate.toISOString();
      const endDate = dateFilter.endDate.toISOString();

      // Get total leads com agendamento criado no período (by data_criacao_agendamento)
      const { count: total } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .not('data_criacao_agendamento', 'is', null)
        .gte('data_criacao_agendamento', startDate)
        .lte('data_criacao_agendamento', endDate);

      // Get leads agendados no período (by data_criacao_agendamento)
      // Considera tanto o nome normalizado quanto o código Bitrix original
      const { count: agendados } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .in('etapa', ['Agendados', 'UC_QWPO2W'])
        .gte('data_criacao_agendamento', startDate)
        .lte('data_criacao_agendamento', endDate);

      return {
        total: total || 0,
        agendados: agendados || 0,
      };
    },
    refetchInterval: 60000,
  });

  const total = data?.total || 0;
  const agendados = data?.agendados || 0;
  const percentage = total > 0 ? (agendados / total) * 100 : 0;
  const formatNumber = (num: number) => num.toLocaleString('pt-BR');

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-28 mb-4" />
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-bl-full opacity-50" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Agendados
        </CardTitle>
        <div className="p-2 rounded-full bg-purple-500/10">
          <CalendarCheck className="h-4 w-4 text-purple-500" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{formatNumber(agendados)}</span>
            <span className="text-sm text-muted-foreground">
              de {formatNumber(total)}
            </span>
          </div>
          <p className="text-sm font-medium text-purple-500 mt-1">
            {percentage.toFixed(1)}% agendados
          </p>
        </div>
        <div className="space-y-1">
          <Progress value={percentage} className="h-2 [&>div]:bg-purple-500" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

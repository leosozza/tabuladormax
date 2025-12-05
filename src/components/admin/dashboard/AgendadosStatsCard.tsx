/**
 * Agendados Statistics Card
 * Shows scheduled leads count and percentage with progress bar
 * Uses dateFilter prop to filter by data_criacao_agendamento date
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

      // Get leads agendados no período (by data_criacao_agendamento)
      // Considera tanto o nome normalizado quanto o código Bitrix original
      const { count: agendados } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .in('etapa', ['Agendados', 'UC_QWPO2W'])
        .gte('data_criacao_agendamento', startDate)
        .lte('data_criacao_agendamento', endDate);

      return agendados || 0;
    },
    refetchInterval: 60000,
  });

  const agendados = data || 0;
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
      <CardContent>
        <span className="text-2xl font-bold">{formatNumber(agendados)}</span>
      </CardContent>
    </Card>
  );
}

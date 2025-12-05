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

export interface AgendadosStatsCardProps {
  dateFilter: DateFilterValue;
  sourceFilter?: 'all' | 'scouter' | 'meta';
}

export function AgendadosStatsCard({ dateFilter, sourceFilter = 'all' }: AgendadosStatsCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['agendados-stats-dashboard', dateFilter.startDate?.toISOString(), dateFilter.endDate?.toISOString(), sourceFilter],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_agendados_stats', {
        p_start_date: dateFilter.startDate.toISOString(),
        p_end_date: dateFilter.endDate.toISOString(),
        p_source_filter: sourceFilter,
      });

      if (error) throw error;
      const result = data as { total: number; agendados: number };
      return result.agendados || 0;
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

/**
 * Photo Statistics Card
 * Shows leads with photos count and percentage with progress bar
 * Uses dateFilter prop to filter by criado date
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Camera } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateFilterValue } from '@/components/MinimalDateFilter';

interface PhotoStatsCardProps {
  dateFilter: DateFilterValue;
}

export function PhotoStatsCard({ dateFilter }: PhotoStatsCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['photo-stats-dashboard', dateFilter.startDate?.toISOString(), dateFilter.endDate?.toISOString()],
    queryFn: async () => {
      const startDate = dateFilter.startDate.toISOString();
      const endDate = dateFilter.endDate.toISOString();

      // Get total leads no período
      const { count: total } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('criado', startDate)
        .lte('criado', endDate);

      // Get leads with photo no período
      const { count: comFoto } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .not('photo_url', 'is', null)
        .gte('criado', startDate)
        .lte('criado', endDate);

      return {
        total: total || 0,
        comFoto: comFoto || 0,
      };
    },
    refetchInterval: 60000,
  });

  const total = data?.total || 0;
  const comFoto = data?.comFoto || 0;
  const percentage = total > 0 ? (comFoto / total) * 100 : 0;
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
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-bl-full opacity-50" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Fichas com Foto
        </CardTitle>
        <div className="p-2 rounded-full bg-primary/10">
          <Camera className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{formatNumber(comFoto)}</span>
            <span className="text-sm text-muted-foreground">
              de {formatNumber(total)}
            </span>
          </div>
          <p className="text-sm font-medium text-primary mt-1">
            {percentage.toFixed(1)}% com fotos
          </p>
        </div>
        <div className="space-y-1">
          <Progress value={percentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

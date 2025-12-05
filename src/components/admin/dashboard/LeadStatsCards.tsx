/**
 * Lead Statistics Cards
 * Shows Total, Confirmed, Awaiting, Not Confirmed with conversion rates
 * Uses dateFilter prop to filter by criado date
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateFilterValue } from '@/components/MinimalDateFilter';

interface LeadStatsCardsProps {
  dateFilter: DateFilterValue;
}

export function LeadStatsCards({ dateFilter }: LeadStatsCardsProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['lead-stats-dashboard', dateFilter.startDate?.toISOString(), dateFilter.endDate?.toISOString()],
    queryFn: async () => {
      const startDate = dateFilter.startDate.toISOString();
      const endDate = dateFilter.endDate.toISOString();

      // Total de leads no período
      const { count: total } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('criado', startDate)
        .lte('criado', endDate);

      // Scouter-Fichas
      const { count: scouter } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('fonte_normalizada', 'Scouter - Fichas')
        .gte('criado', startDate)
        .lte('criado', endDate);

      // Meta
      const { count: meta } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('fonte_normalizada', 'Meta')
        .gte('criado', startDate)
        .lte('criado', endDate);

      // Confirmadas: ficha_confirmada = true
      const { count: confirmadas } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('ficha_confirmada', true)
        .gte('criado', startDate)
        .lte('criado', endDate);

      // Não Confirmadas: ficha_confirmada = false
      const { count: naoConfirmadas } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('ficha_confirmada', false)
        .gte('criado', startDate)
        .lte('criado', endDate);

      // Aguardando: ficha_confirmada IS NULL
      const { count: aguardando } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .is('ficha_confirmada', null)
        .gte('criado', startDate)
        .lte('criado', endDate);

      // Outros = total - scouter - meta
      const outros = (total || 0) - (scouter || 0) - (meta || 0);

      return {
        total: total || 0,
        scouter: scouter || 0,
        meta: meta || 0,
        outros: outros,
        confirmadas: confirmadas || 0,
        aguardando: aguardando || 0,
        naoConfirmadas: naoConfirmadas || 0,
      };
    },
    refetchInterval: 60000,
  });

  const formatNumber = (num: number) => num.toLocaleString('pt-BR');
  
  const calcRate = (value: number, total: number) => {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total de Leads',
      value: stats?.total || 0,
      rate: null,
      breakdown: {
        scouter: stats?.scouter || 0,
        meta: stats?.meta || 0,
        outros: stats?.outros || 0,
      },
      icon: TrendingUp,
      iconColor: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Leads Verificados',
      value: stats?.confirmadas || 0,
      rate: calcRate(stats?.confirmadas || 0, stats?.total || 0),
      breakdown: null,
      icon: CheckCircle2,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Leads em Verificação',
      value: stats?.aguardando || 0,
      rate: calcRate(stats?.aguardando || 0, stats?.total || 0),
      breakdown: null,
      icon: Clock,
      iconColor: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Leads Não Reconhecidos',
      value: stats?.naoConfirmadas || 0,
      rate: calcRate(stats?.naoConfirmadas || 0, stats?.total || 0),
      breakdown: null,
      icon: XCircle,
      iconColor: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="relative overflow-hidden">
          <div className={`absolute top-0 right-0 w-20 h-20 ${card.bgColor} rounded-bl-full opacity-50`} />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-full ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.iconColor}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(card.value)}</div>
            {card.breakdown && (
              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                <p>Scouter: <span className="font-medium">{formatNumber(card.breakdown.scouter)}</span></p>
                <p>Meta: <span className="font-medium">{formatNumber(card.breakdown.meta)}</span></p>
                <p>Outros: <span className="font-medium">{formatNumber(card.breakdown.outros)}</span></p>
              </div>
            )}
            {card.rate && (
              <p className="text-xs text-muted-foreground mt-1">
                Taxa de conversão: <span className="font-medium">{card.rate}</span>
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

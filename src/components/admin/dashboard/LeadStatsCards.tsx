/**
 * Lead Statistics Cards
 * Shows Total, Confirmed, Awaiting, Not Confirmed with conversion rates
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface LeadStats {
  total: number;
  confirmadas: number;
  aguardando: number;
  naoConfirmadas: number;
}

interface LeadStatsCardsProps {
  stats: LeadStats | null;
  isLoading: boolean;
}

export function LeadStatsCards({ stats, isLoading }: LeadStatsCardsProps) {
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
      icon: TrendingUp,
      iconColor: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Fichas Confirmadas',
      value: stats?.confirmadas || 0,
      rate: calcRate(stats?.confirmadas || 0, stats?.total || 0),
      icon: CheckCircle2,
      iconColor: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Fichas Aguardando',
      value: stats?.aguardando || 0,
      rate: calcRate(stats?.aguardando || 0, stats?.total || 0),
      icon: Clock,
      iconColor: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Fichas Não Confirmadas',
      value: stats?.naoConfirmadas || 0,
      rate: calcRate(stats?.naoConfirmadas || 0, stats?.total || 0),
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

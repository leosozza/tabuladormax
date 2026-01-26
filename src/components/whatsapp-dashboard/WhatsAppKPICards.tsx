import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Clock, AlertCircle, CheckCircle, Mail } from 'lucide-react';
import type { DashboardKPIs } from '@/hooks/useWhatsAppDashboardStats';

interface WhatsAppKPICardsProps {
  kpis: DashboardKPIs | undefined;
  closedCount: number | undefined;
  isLoading: boolean;
}

export function WhatsAppKPICards({ kpis, closedCount, isLoading }: WhatsAppKPICardsProps) {
  const cards = [
    {
      title: 'Janelas Abertas',
      value: kpis?.open_windows ?? 0,
      icon: MessageSquare,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      description: 'Últimas 24h',
    },
    {
      title: 'Aguardando Resposta',
      value: kpis?.waiting ?? 0,
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      description: 'Cliente respondeu',
    },
    {
      title: 'Nunca Respondidas',
      value: kpis?.never ?? 0,
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      description: 'Sem resposta da equipe',
    },
    {
      title: 'Encerradas',
      value: closedCount ?? 0,
      icon: CheckCircle,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      description: 'Atendimentos finalizados',
    },
    {
      title: 'Mensagens Não Lidas',
      value: kpis?.unread ?? 0,
      icon: Mail,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      description: 'Total pendente',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="rounded-xl">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="rounded-xl hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">{card.title}</span>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
              <div className={`text-2xl font-bold ${card.color}`}>
                {card.value.toLocaleString('pt-BR')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

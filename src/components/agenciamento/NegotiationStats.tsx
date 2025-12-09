// Negotiation Statistics Component
// Dashboard cards showing key metrics

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, FileText, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import type { Negotiation } from '@/types/agenciamento';

interface NegotiationStatsProps {
  negotiations: Negotiation[];
}

export function NegotiationStats({ negotiations }: NegotiationStatsProps) {
  // Calculate statistics
  const stats = {
    total: negotiations.length,
    totalValue: negotiations.reduce((sum, n) => sum + n.total_value, 0),
    inicial: negotiations.filter((n) => n.status === 'inicial').length,
    fichaPreenchida: negotiations.filter((n) => n.status === 'ficha_preenchida').length,
    atendimentoProdutor: negotiations.filter((n) => n.status === 'atendimento_produtor').length,
    realizado: negotiations.filter((n) => n.status === 'realizado').length,
    naoRealizado: negotiations.filter((n) => n.status === 'nao_realizado').length,
    averageValue:
      negotiations.length > 0
        ? negotiations.reduce((sum, n) => sum + n.total_value, 0) / negotiations.length
        : 0,
  };

  const cards = [
    {
      title: 'Total de Negociações',
      value: stats.total,
      icon: FileText,
      color: 'text-blue-600',
    },
    {
      title: 'Valor Total',
      value: `R$ ${stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      title: 'Inicial',
      value: stats.inicial,
      icon: Clock,
      color: 'text-slate-600',
    },
    {
      title: 'Atendimento Produtor',
      value: stats.atendimentoProdutor,
      icon: Clock,
      color: 'text-amber-600',
    },
    {
      title: 'Realizados',
      value: stats.realizado,
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      title: 'Não Realizados',
      value: stats.naoRealizado,
      icon: Clock,
      color: 'text-red-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

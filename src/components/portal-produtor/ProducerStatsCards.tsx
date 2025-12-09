import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Clock, CheckCircle, DollarSign } from 'lucide-react';
import { DealStatusFilter } from './ProducerDashboard';

interface ProducerStats {
  total_deals: number;
  deals_pendentes: number;
  deals_em_andamento: number;
  deals_concluidos: number;
  valor_total: number;
}

interface ProducerStatsCardsProps {
  stats: ProducerStats | null;
  isLoading: boolean;
  onFilterClick: (filter: DealStatusFilter) => void;
}

export const ProducerStatsCards = ({ stats, isLoading, onFilterClick }: ProducerStatsCardsProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total de Deals',
      value: stats?.total_deals || 0,
      icon: FileText,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      filter: 'all' as DealStatusFilter
    },
    {
      title: 'Pendentes',
      value: stats?.deals_pendentes || 0,
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      filter: 'pendentes' as DealStatusFilter
    },
    {
      title: 'Em Andamento',
      value: stats?.deals_em_andamento || 0,
      icon: FileText,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      filter: 'em_andamento' as DealStatusFilter
    },
    {
      title: 'Concluídos',
      value: stats?.deals_concluidos || 0,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      filter: 'concluidos' as DealStatusFilter
    }
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card 
            key={card.title} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onFilterClick(card.filter)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{card.title}</p>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Card de valor total */}
      <Card className="bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Total em Deals</p>
                <p className="text-2xl font-bold">{formatCurrency(stats?.valor_total || 0)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Camera, 
  CheckCircle, 
  Calendar, 
  RefreshCw, 
  UserCheck, 
  Clock,
  Copy
} from 'lucide-react';

interface Stats {
  total_leads: number;
  com_foto: number;
  confirmados: number;
  agendados: number;
  reagendar: number;
  compareceram: number;
  pendentes: number;
  duplicados: number;
}

interface ScouterStatsCardsProps {
  stats: Stats | null;
  isLoading: boolean;
  onCardClick?: (filterType: string, label: string) => void;
}

export const ScouterStatsCards = ({ stats, isLoading, onCardClick }: ScouterStatsCardsProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum dado encontrado para o período selecionado
      </div>
    );
  }

  const cards = [
    { 
      title: 'Total de Leads', 
      value: stats.total_leads, 
      icon: Users, 
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      filterType: 'all'
    },
    { 
      title: 'Com Foto', 
      value: stats.com_foto, 
      icon: Camera, 
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      filterType: 'com_foto'
    },
    { 
      title: 'Confirmados', 
      value: stats.confirmados, 
      icon: CheckCircle, 
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      filterType: 'confirmados'
    },
    { 
      title: 'Agendados', 
      value: stats.agendados, 
      icon: Calendar, 
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      filterType: 'agendados'
    },
    { 
      title: 'Reagendar', 
      value: stats.reagendar, 
      icon: RefreshCw, 
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      filterType: 'reagendar'
    },
    { 
      title: 'Compareceram', 
      value: stats.compareceram, 
      icon: UserCheck, 
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      filterType: 'compareceram'
    },
    { 
      title: 'Pendentes', 
      value: stats.pendentes, 
      icon: Clock, 
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      filterType: 'pendentes'
    },
    { 
      title: 'Duplicados', 
      value: stats.duplicados, 
      icon: Copy, 
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
      filterType: 'duplicados'
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
      {cards.map((card) => (
        <Card 
          key={card.title} 
          className="overflow-hidden cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
          onClick={() => onCardClick?.(card.filterType, card.title)}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-full ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {card.value.toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

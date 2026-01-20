import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Star, TrendingUp } from 'lucide-react';
import { useSupervisorTeam } from '@/hooks/useSupervisorTeam';

interface TeleKPICardsProps {
  commercialProjectId?: string;
  supervisorBitrixId: number;
  operatorCargo: string;
}

export const TeleKPICards = ({ commercialProjectId, supervisorBitrixId, operatorCargo }: TeleKPICardsProps) => {
  const { data: teamData } = useSupervisorTeam(
    commercialProjectId || null,
    supervisorBitrixId,
    operatorCargo
  );

  const teamSize = teamData?.agents?.length || 0;
  
  // Mock CSAT and KPI for now - can be connected to real data later
  const csat = 4.8;
  const kpi = 92;

  const kpis = [
    {
      title: 'Team Size',
      value: teamSize.toString(),
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      title: 'CSAT',
      value: csat.toFixed(1),
      icon: Star,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10'
    },
    {
      title: 'KPI',
      value: `${kpi}%`,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    }
  ];

  return (
    <div className="grid grid-cols-3 gap-3 px-4 py-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title} className="text-center border-none shadow-sm bg-card/50">
          <CardHeader className="pb-1 pt-3 px-2">
            <div className={`w-8 h-8 rounded-full ${kpi.bgColor} flex items-center justify-center mx-auto mb-1`}>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {kpi.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-2">
            <span className="text-2xl font-bold">{kpi.value}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

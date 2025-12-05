import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Clock, Lightbulb, TrendingUp } from 'lucide-react';

interface StatsFeature {
  id: string;
  status: string;
  progress?: number;
}

interface RoadmapStatsProps {
  features: StatsFeature[];
}

export function RoadmapStats({ features }: RoadmapStatsProps) {
  const activeCount = features.filter(f => f.status === 'active' || f.status === 'beta').length;
  const inProgressCount = features.filter(f => f.status === 'in-progress').length;
  const plannedCount = features.filter(f => f.status === 'planned').length;
  const totalCount = features.length;
  
  const progressPercent = Math.round((activeCount / totalCount) * 100);
  
  const avgProgress = features
    .filter(f => f.progress !== undefined)
    .reduce((acc, f) => acc + (f.progress || 0), 0) / (inProgressCount || 1);

  const stats = [
    {
      label: 'Implementadas',
      value: activeCount,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Em Desenvolvimento',
      value: inProgressCount,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      subValue: `${Math.round(avgProgress)}% média`,
    },
    {
      label: 'Planejadas',
      value: plannedCount,
      icon: Lightbulb,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Progresso Geral',
      value: `${progressPercent}%`,
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      subValue: `${totalCount} features`,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                {stat.subValue && (
                  <p className="text-xs text-muted-foreground/70">{stat.subValue}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

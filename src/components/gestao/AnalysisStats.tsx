import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, Star, SkipForward, TrendingUp } from 'lucide-react';

interface AnalysisStatsProps {
  total: number;
  approved: number;
  rejected: number;
  superApproved: number;
  skipped: number;
  startTime: Date;
}

export default function AnalysisStats({
  total,
  approved,
  rejected,
  superApproved,
  skipped,
  startTime
}: AnalysisStatsProps) {
  const elapsedMinutes = Math.floor((Date.now() - startTime.getTime()) / 60000);
  const avgTimePerLead = total > 0 ? (elapsedMinutes / total).toFixed(1) : '0.0';

  const stats = [
    { label: 'Aprovados', value: approved, icon: CheckCircle2, color: 'text-green-600' },
    { label: 'Super Aprovados', value: superApproved, icon: Star, color: 'text-yellow-600' },
    { label: 'Reprovados', value: rejected, icon: XCircle, color: 'text-red-600' },
    { label: 'Pulados', value: skipped, icon: SkipForward, color: 'text-muted-foreground' }
  ];

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Estatísticas da Sessão</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-3">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                <p className="text-lg font-bold">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
          <span>Tempo médio: {avgTimePerLead} min/lead</span>
          <span className="font-semibold text-foreground">{total} total</span>
        </div>
      </CardContent>
    </Card>
  );
}

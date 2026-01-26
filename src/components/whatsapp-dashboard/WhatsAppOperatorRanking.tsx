import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { TopOperator } from '@/hooks/useWhatsAppDashboardStats';

interface WhatsAppOperatorRankingProps {
  data: TopOperator[] | undefined;
  isLoading: boolean;
}

export function WhatsAppOperatorRanking({ data, isLoading }: WhatsAppOperatorRankingProps) {
  if (isLoading) {
    return (
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Top Atendentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxMessages = data?.[0]?.messages ?? 1;

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle>Top Atendentes (7 dias)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data?.length ? (
            data.map((operator, index) => {
              const percentage = (operator.messages / maxMessages) * 100;
              const initials = operator.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return (
                <div key={operator.name} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 min-w-[140px]">
                    <span className="text-sm font-medium text-muted-foreground w-5">
                      {index + 1}.
                    </span>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate max-w-[100px]" title={operator.name}>
                      {operator.name}
                    </span>
                  </div>
                  <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/80 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground min-w-[60px] text-right">
                    {operator.messages.toLocaleString('pt-BR')}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum dado disponível
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

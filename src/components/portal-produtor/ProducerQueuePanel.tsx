import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Pause,
  Timer
} from 'lucide-react';
import { useProducerQueue } from '@/hooks/useProducerQueue';
import { cn } from '@/lib/utils';

interface ProducerQueuePanelProps {
  producerId: string;
}

export function ProducerQueuePanel({ producerId }: ProducerQueuePanelProps) {
  const { 
    myStatus, 
    waitTime, 
    queue, 
    isAvailable,
    isInAttendance,
    hasPenalty,
    conversionRate,
  } = useProducerQueue(producerId);

  const formatTime = (minutes: number | null) => {
    if (!minutes) return '--';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  return (
    <div className="space-y-4">
      {/* Painel de Estatísticas do Produtor */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Suas Estatísticas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="space-y-1">
              <p className="text-2xl font-bold">{myStatus?.total_attendances || 0}</p>
              <p className="text-xs text-muted-foreground">Atendimentos</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-green-600">{myStatus?.total_closed || 0}</p>
              <p className="text-xs text-muted-foreground">Fechados</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-destructive">{myStatus?.total_lost || 0}</p>
              <p className="text-xs text-muted-foreground">Perdidos</p>
            </div>
          </div>

          {/* Taxa de Conversão */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Taxa de Conversão</span>
              <span className="font-medium">{conversionRate}%</span>
            </div>
            <Progress value={conversionRate} className="h-2" />
          </div>

          {/* Tempo Médio */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Timer className="h-3 w-3" />
              Tempo Médio
            </span>
            <span className="font-medium">
              {formatTime(myStatus?.average_attendance_time || null)}
            </span>
          </div>

          {/* Perdas Consecutivas */}
          {(myStatus?.consecutive_losses || 0) > 0 && (
            <div className={cn(
              "flex items-center justify-between p-2 rounded-lg",
              hasPenalty ? "bg-destructive/10" : "bg-amber-500/10"
            )}>
              <span className="text-sm flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Perdas Consecutivas
              </span>
              <Badge variant={hasPenalty ? "destructive" : "outline"}>
                {myStatus?.consecutive_losses}/2
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Painel de Espera */}
      {isAvailable && waitTime && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Tempo de Espera
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <p className="text-3xl font-bold">
                {waitTime.queue_pos ? `#${waitTime.queue_pos}` : '--'}
              </p>
              <p className="text-sm text-muted-foreground">Sua posição na fila</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-sm">
              <div className="p-2 bg-muted rounded-lg">
                <p className="font-medium">{waitTime.producers_ahead}</p>
                <p className="text-xs text-muted-foreground">Produtores à frente</p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <p className="font-medium">{formatTime(waitTime.estimated_minutes)}</p>
                <p className="text-xs text-muted-foreground">Tempo estimado</p>
              </div>
            </div>

            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">Clientes aguardando</span>
              <Badge variant="secondary">{waitTime.clients_waiting}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Produtores disponíveis</span>
              <Badge variant="secondary">{waitTime.producers_available}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista da Fila */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Fila de Produtores
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!queue ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : queue.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum produtor na fila
            </p>
          ) : (
            <div className="space-y-2">
              {queue.map((producer) => {
                const isMe = producer.producer_id === producerId;
                const isAttending = producer.status === 'EM_ATENDIMENTO';
                const isPaused = producer.status === 'PAUSA';

                return (
                  <div
                    key={producer.producer_id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg transition-colors",
                      isMe && "bg-primary/5 border border-primary/20",
                      isAttending && "bg-blue-50 dark:bg-blue-950/20",
                      isPaused && "opacity-60"
                    )}
                  >
                    {/* Posição */}
                    <div className="w-8 text-center">
                      {isAttending ? (
                        <Clock className="h-4 w-4 mx-auto text-blue-600" />
                      ) : isPaused ? (
                        <Pause className="h-4 w-4 mx-auto text-amber-600" />
                      ) : producer.queue_pos ? (
                        <span className="text-sm font-bold text-muted-foreground">
                          #{producer.queue_pos}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={producer.producer_photo || undefined} />
                      <AvatarFallback className="text-xs">
                        {producer.producer_name?.slice(0, 2).toUpperCase() || 'P'}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        isMe && "text-primary"
                      )}>
                        {producer.producer_name || 'Produtor'}
                        {isMe && <span className="text-xs text-muted-foreground ml-1">(você)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {producer.total_attendances} atendimentos • {producer.conversion_rate}%
                      </p>
                    </div>

                    {/* Status badges */}
                    <div className="flex items-center gap-1">
                      {producer.penalty_active && (
                        <Badge variant="destructive" className="text-xs px-1">
                          <AlertTriangle className="h-3 w-3" />
                        </Badge>
                      )}
                      {isAttending && (
                        <Badge variant="secondary" className="text-xs">
                          Atendendo
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

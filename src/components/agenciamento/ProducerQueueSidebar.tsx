// Producer Queue Sidebar for Agenciamento page
// Shows online producers, queue order, and status in real-time

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Pause,
  Phone,
  Trophy,
  Target,
} from 'lucide-react';
import { useProducerQueueView, type ProducerInQueueView } from '@/hooks/useProducerQueueView';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  DISPONIVEL: {
    label: 'Disponível',
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-700',
    icon: CheckCircle,
  },
  EM_ATENDIMENTO: {
    label: 'Atendendo',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-700',
    icon: Phone,
  },
  PAUSA: {
    label: 'Pausa',
    color: 'bg-amber-500',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-700',
    icon: Pause,
  },
  INDISPONIVEL: {
    label: 'Offline',
    color: 'bg-muted',
    bgColor: 'bg-muted/50',
    textColor: 'text-muted-foreground',
    icon: Users,
  },
};

function ProducerQueueItem({ producer, isNext }: { producer: ProducerInQueueView; isNext: boolean }) {
  const config = STATUS_CONFIG[producer.status];
  const StatusIcon = config.icon;
  const producerName = producer.producer_name || 'Produtor';
  const initials = producerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg transition-colors',
        isNext && 'ring-2 ring-primary ring-offset-1',
        config.bgColor
      )}
    >
      {/* Position or Status Icon */}
      <div className="w-6 text-center flex-shrink-0">
        {producer.queue_pos ? (
          <span className="text-sm font-bold text-muted-foreground">
            #{producer.queue_pos}
          </span>
        ) : (
          <StatusIcon className={cn('h-4 w-4', config.textColor)} />
        )}
      </div>

      {/* Avatar */}
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className={cn('text-xs', config.bgColor, config.textColor)}>
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{producerName}</span>
          {producer.penalty_active && (
            <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />
          )}
          {isNext && (
            <Badge variant="default" className="text-[10px] px-1 py-0 h-4">
              Próximo
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Trophy className="h-3 w-3" />
            {producer.total_attendances}
          </span>
          <span className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            {Math.round(producer.conversion_rate)}%
          </span>
        </div>
      </div>

      {/* Status Dot */}
      <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', config.color)} />
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProducerQueueSidebar() {
  const {
    queue,
    sortedQueue,
    stats,
    nextProducer,
    attendingProducers,
    pausedProducers,
    waitingClientsCount,
    estimatedWaitMinutes,
    isLoading,
  } = useProducerQueueView();

  const formatTime = (minutes: number | null) => {
    if (minutes === null) return '--';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  return (
    <Card className="w-72 flex-shrink-0 h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Produtores Online
          </span>
          <Badge variant="secondary" className="font-normal">
            {stats.total_online}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Summary */}
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-700 border-emerald-200"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            {stats.available_count} Disponíveis
          </Badge>
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-700 border-blue-200"
          >
            <Phone className="h-3 w-3 mr-1" />
            {stats.attending_count} Atendendo
          </Badge>
          {stats.paused_count > 0 && (
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-700 border-amber-200"
            >
              <Pause className="h-3 w-3 mr-1" />
              {stats.paused_count} Pausa
            </Badge>
          )}
        </div>

        <Separator />

        {/* Queue Section */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Fila da Vez
          </h4>

          {isLoading ? (
            <QueueSkeleton />
          ) : sortedQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum produtor na fila
            </p>
          ) : (
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {sortedQueue.map((producer) => (
                  <ProducerQueueItem
                    key={producer.producer_id}
                    producer={producer}
                    isNext={nextProducer?.producer_id === producer.producer_id}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Attending Section */}
        {attendingProducers.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Em Atendimento
              </h4>
              <div className="space-y-2">
                {attendingProducers.map((producer) => (
                  <ProducerQueueItem
                    key={producer.producer_id}
                    producer={producer}
                    isNext={false}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Paused Section */}
        {pausedProducers.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-muted-foreground">
                <Pause className="h-4 w-4" />
                Em Pausa
              </h4>
              <div className="space-y-2">
                {pausedProducers.map((producer) => (
                  <ProducerQueueItem
                    key={producer.producer_id}
                    producer={producer}
                    isNext={false}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Waiting Info */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              Clientes aguardando
            </span>
            <span className="font-medium text-foreground">{waitingClientsCount}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Tempo estimado
            </span>
            <span className="font-medium text-foreground">
              {formatTime(estimatedWaitMinutes)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

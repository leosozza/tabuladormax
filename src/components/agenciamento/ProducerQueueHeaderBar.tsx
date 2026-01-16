// Producer Queue Header Bar - Collapsible panel for the top menu
// Shows online producers, queue order, and waiting clients count

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Pause,
  Phone,
  Trophy,
  Target,
  ChevronDown,
  ChevronUp,
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

function ProducerQueueItemCompact({ producer, isNext }: { producer: ProducerInQueueView; isNext: boolean }) {
  const config = STATUS_CONFIG[producer.status];
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
        'flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors',
        isNext && 'ring-1 ring-primary',
        config.bgColor
      )}
    >
      {/* Position */}
      <span className="text-xs font-bold text-muted-foreground w-5 text-center">
        {producer.queue_pos ? `#${producer.queue_pos}` : '-'}
      </span>

      {/* Avatar */}
      <Avatar className="h-6 w-6">
        <AvatarFallback className={cn('text-[10px]', config.bgColor, config.textColor)}>
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Name */}
      <span className="text-xs font-medium truncate max-w-20">{producerName}</span>

      {/* Indicators */}
      {producer.penalty_active && (
        <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />
      )}
      {isNext && (
        <Badge variant="default" className="text-[9px] px-1 py-0 h-3.5">
          Próximo
        </Badge>
      )}

      {/* Status Dot */}
      <div className={cn('w-2 h-2 rounded-full flex-shrink-0 ml-auto', config.color)} />
    </div>
  );
}

export function ProducerQueueHeaderBar() {
  const [isOpen, setIsOpen] = useState(false);
  const {
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
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      {/* Compact Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Producers Summary */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Fila da Vez</span>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-200 text-xs h-5">
                <CheckCircle className="h-3 w-3 mr-1" />
                {stats.available_count}
              </Badge>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-200 text-xs h-5">
                <Phone className="h-3 w-3 mr-1" />
                {stats.attending_count}
              </Badge>
              {stats.paused_count > 0 && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-200 text-xs h-5">
                  <Pause className="h-3 w-3 mr-1" />
                  {stats.paused_count}
                </Badge>
              )}
            </div>
          </div>

          <Separator orientation="vertical" className="h-5" />

          {/* Waiting Clients */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Aguardando:</span>
            <Badge variant="secondary" className="h-5">
              {waitingClientsCount} clientes
            </Badge>
          </div>

          <Separator orientation="vertical" className="h-5" />

          {/* Estimated Time */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Tempo estimado:</span>
            <span className="font-medium">{formatTime(estimatedWaitMinutes)}</span>
          </div>
        </div>

        {/* Toggle Button */}
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2">
            {isOpen ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Recolher
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Expandir
              </>
            )}
          </Button>
        </CollapsibleTrigger>
      </div>

      {/* Expanded Content */}
      <CollapsibleContent>
        <div className="bg-muted/20 border-b px-4 py-3">
          <div className="flex gap-6 flex-wrap">
            {/* Queue Column */}
            <div className="flex-1 min-w-[200px]">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Fila da Vez
              </h4>
              {isLoading ? (
                <p className="text-xs text-muted-foreground">Carregando...</p>
              ) : sortedQueue.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum produtor na fila</p>
              ) : (
                <ScrollArea className="max-h-32">
                  <div className="space-y-1">
                    {sortedQueue.map((producer) => (
                      <ProducerQueueItemCompact
                        key={producer.producer_id}
                        producer={producer}
                        isNext={nextProducer?.producer_id === producer.producer_id}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Attending Column */}
            {attendingProducers.length > 0 && (
              <div className="flex-1 min-w-[200px]">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Em Atendimento
                </h4>
                <div className="space-y-1">
                  {attendingProducers.map((producer) => (
                    <ProducerQueueItemCompact
                      key={producer.producer_id}
                      producer={producer}
                      isNext={false}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Paused Column */}
            {pausedProducers.length > 0 && (
              <div className="flex-1 min-w-[200px]">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-muted-foreground">
                  <Pause className="h-4 w-4" />
                  Em Pausa
                </h4>
                <div className="space-y-1">
                  {pausedProducers.map((producer) => (
                    <ProducerQueueItemCompact
                      key={producer.producer_id}
                      producer={producer}
                      isNext={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  CheckCircle2, 
  Clock, 
  Pause, 
  LogOut,
  ChevronDown,
  AlertTriangle,
  Loader2,
  Users
} from 'lucide-react';
import { useProducerQueue, ProducerStatus } from '@/hooks/useProducerQueue';
import { cn } from '@/lib/utils';

interface ProducerStatusControlProps {
  producerId: string;
  onLogout?: () => void;
}

const STATUS_CONFIG: Record<ProducerStatus, { 
  label: string; 
  color: string; 
  bgColor: string;
  icon: React.ReactNode;
}> = {
  DISPONIVEL: { 
    label: 'Disponível', 
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: <CheckCircle2 className="h-4 w-4" />
  },
  EM_ATENDIMENTO: { 
    label: 'Em Atendimento', 
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: <Clock className="h-4 w-4" />
  },
  PAUSA: { 
    label: 'Pausa', 
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    icon: <Pause className="h-4 w-4" />
  },
  INDISPONIVEL: { 
    label: 'Indisponível', 
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    icon: <LogOut className="h-4 w-4" />
  },
};

export function ProducerStatusControl({ producerId, onLogout }: ProducerStatusControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const {
    myStatus,
    waitTime,
    isAvailable,
    isInAttendance,
    isPaused,
    hasPenalty,
    isLoadingStatus,
    joinQueue,
    leaveQueue,
    isJoiningQueue,
    isLeavingQueue,
  } = useProducerQueue(producerId);

  const currentStatus = myStatus?.status || 'INDISPONIVEL';
  const config = STATUS_CONFIG[currentStatus];
  const isLoading = isJoiningQueue || isLeavingQueue;

  const handleSetAvailable = () => {
    joinQueue();
    setIsOpen(false);
  };

  const handleSetPause = () => {
    leaveQueue('PAUSA');
    setIsOpen(false);
  };

  const handleSetUnavailable = () => {
    leaveQueue('INDISPONIVEL');
    setIsOpen(false);
    onLogout?.();
  };

  if (isLoadingStatus) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Badge de posição na fila */}
      {isAvailable && waitTime?.queue_pos && (
        <Badge variant="outline" className="gap-1 font-normal">
          <Users className="h-3 w-3" />
          <span>#{waitTime.queue_pos} na fila</span>
        </Badge>
      )}

      {/* Indicador de penalidade */}
      {hasPenalty && (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          <span>Penalidade ativa</span>
        </Badge>
      )}

      {/* Dropdown de status */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild disabled={isInAttendance || isLoading}>
          <Button 
            variant="outline" 
            size="sm"
            className={cn(
              'gap-2 min-w-[140px] justify-between',
              config.bgColor,
              config.color,
              isInAttendance && 'cursor-not-allowed opacity-70'
            )}
          >
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                config.icon
              )}
              <span>{config.label}</span>
            </div>
            {!isInAttendance && <ChevronDown className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          {!isAvailable && (
            <DropdownMenuItem 
              onClick={handleSetAvailable}
              className="gap-2 text-green-700 dark:text-green-400"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Ficar Disponível</span>
            </DropdownMenuItem>
          )}

          {(isAvailable || isPaused) && (
            <>
              {isAvailable && (
                <DropdownMenuItem 
                  onClick={handleSetPause}
                  className="gap-2 text-amber-700 dark:text-amber-400"
                >
                  <Pause className="h-4 w-4" />
                  <span>Pausar</span>
                </DropdownMenuItem>
              )}

              {isPaused && (
                <DropdownMenuItem 
                  onClick={handleSetAvailable}
                  className="gap-2 text-green-700 dark:text-green-400"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Voltar para Fila</span>
                </DropdownMenuItem>
              )}
            </>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem 
            onClick={handleSetUnavailable}
            className="gap-2 text-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair do Portal</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

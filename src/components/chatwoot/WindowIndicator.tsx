import { Lock, Unlock, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WindowStatus, formatWindowTime } from '@/lib/whatsappWindow';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface WindowIndicatorProps {
  status: WindowStatus;
  variant?: 'badge' | 'dot' | 'banner';
  className?: string;
}

export function WindowIndicator({ status, variant = 'badge', className }: WindowIndicatorProps) {
  const isOpen = status.isOpen;
  
  // Dot variant - apenas círculo colorido
  if (variant === 'dot') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'w-3 h-3 rounded-full flex-shrink-0',
                isOpen ? 'bg-green-500' : 'bg-red-500',
                className
              )}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>{isOpen ? formatWindowTime(status) : 'Janela fechada - Use template'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Badge variant - badge com texto
  if (variant === 'badge') {
    return (
      <Badge
        variant={isOpen ? 'default' : 'destructive'}
        className={cn(
          'gap-1 text-xs',
          isOpen && 'bg-green-500 hover:bg-green-600',
          className
        )}
      >
        {isOpen ? (
          <>
            <Unlock className="w-3 h-3" />
            <span>{formatWindowTime(status)}</span>
          </>
        ) : (
          <>
            <Lock className="w-3 h-3" />
            <span>Janela fechada</span>
          </>
        )}
      </Badge>
    );
  }

  // Banner variant - banner completo para o chat
  if (variant === 'banner') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-sm',
          isOpen 
            ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-b border-green-500/20' 
            : 'bg-red-500/10 text-red-700 dark:text-red-400 border-b border-red-500/20',
          className
        )}
      >
        {isOpen ? (
          <>
            <Unlock className="w-4 h-4" />
            <span className="font-medium">Janela aberta</span>
            <span className="text-muted-foreground">-</span>
            <Clock className="w-3 h-3" />
            <span>{formatWindowTime(status)}</span>
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            <span className="font-medium">Janela fechada</span>
            <span className="text-muted-foreground">-</span>
            <span>Envie um template para iniciar conversa</span>
          </>
        )}
      </div>
    );
  }

  return null;
}

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WindowStatus, formatWindowTime } from '@/lib/whatsappWindow';
import { cn } from '@/lib/utils';

interface WindowTimeCircleProps {
  status: WindowStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export function WindowTimeCircle({ status, size = 'sm', className }: WindowTimeCircleProps) {
  const isOpen = status.isOpen;
  
  // Calculate progress (0-100) based on remaining time
  // Full 24 hours = 100%, 0 hours = 0%
  const totalMinutes = (status.hoursRemaining || 0) * 60 + (status.minutesRemaining || 0);
  const maxMinutes = 24 * 60; // 24 hours in minutes
  const progress = isOpen ? Math.max(0, Math.min(100, (totalMinutes / maxMinutes) * 100)) : 0;
  
  // Circle dimensions
  const dimensions = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const strokeWidth = size === 'sm' ? 3 : 4;
  const radius = size === 'sm' ? 12 : 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  // Format time display
  const getTimeDisplay = () => {
    if (!isOpen) return '—';
    if (status.hoursRemaining && status.hoursRemaining > 0) {
      return `${status.hoursRemaining}h`;
    }
    if (status.minutesRemaining && status.minutesRemaining > 0) {
      return `${status.minutesRemaining}m`;
    }
    return '<1m';
  };
  
  const getTooltipText = () => {
    if (!isOpen) return 'Janela expirada';
    return `Janela aberta - ${formatWindowTime(status)}`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('relative flex items-center justify-center cursor-help', dimensions, className)}>
            <svg className="transform -rotate-90 w-full h-full">
              {/* Background circle */}
              <circle
                cx="50%"
                cy="50%"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-muted/30"
              />
              {/* Progress circle */}
              <circle
                cx="50%"
                cy="50%"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className={cn(
                  'transition-all duration-300',
                  isOpen 
                    ? progress > 25 
                      ? 'text-green-500' 
                      : 'text-amber-500'
                    : 'text-destructive/50'
                )}
              />
            </svg>
            {/* Center text */}
            <span className={cn(
              'absolute text-[10px] font-medium',
              isOpen ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {getTimeDisplay()}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

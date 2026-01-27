import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvitedBadgeProps {
  inviterName: string;
  className?: string;
}

export function InvitedBadge({ inviterName, className }: InvitedBadgeProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded',
        'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
        'animate-pulse',
        className
      )}
    >
      <Bell className="h-3 w-3" />
      <span className="truncate">Convidado por: {inviterName}</span>
    </div>
  );
}

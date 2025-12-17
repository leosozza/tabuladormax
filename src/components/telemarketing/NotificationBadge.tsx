import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUnreadNotifications } from '@/hooks/useTelemarketingNotifications';
import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  bitrixTelemarketingId: number | null;
  onClick?: () => void;
  className?: string;
}

export const NotificationBadge = ({ 
  bitrixTelemarketingId, 
  onClick,
  className 
}: NotificationBadgeProps) => {
  const { data: unreadNotifications = [] } = useUnreadNotifications(bitrixTelemarketingId);
  const unreadCount = unreadNotifications.length;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn("relative", className)}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Button>
  );
};

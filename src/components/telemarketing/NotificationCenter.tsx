import { useState } from 'react';
import { Bell, Check, CheckCheck, MessageSquare, Bot, AlertTriangle, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useNotifications, 
  useUnreadNotifications,
  useMarkAsRead, 
  useMarkAllAsRead,
  TelemarketingNotification 
} from '@/hooks/useTelemarketingNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface NotificationCenterProps {
  bitrixTelemarketingId: number | null;
  onNotificationClick?: (notification: TelemarketingNotification) => void;
}

const getNotificationIcon = (type: TelemarketingNotification['type']) => {
  switch (type) {
    case 'new_message':
      return <MessageSquare className="h-4 w-4 text-primary" />;
    case 'bot_transfer':
      return <Bot className="h-4 w-4 text-orange-500" />;
    case 'urgent':
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case 'window_closing':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

const getNotificationBg = (type: TelemarketingNotification['type'], isRead: boolean) => {
  if (isRead) return 'bg-muted/30';
  
  switch (type) {
    case 'urgent':
      return 'bg-destructive/10 border-l-2 border-l-destructive';
    case 'bot_transfer':
      return 'bg-orange-500/10 border-l-2 border-l-orange-500';
    case 'new_message':
      return 'bg-primary/10 border-l-2 border-l-primary';
    default:
      return 'bg-muted/50';
  }
};

export const NotificationCenter = ({ 
  bitrixTelemarketingId,
  onNotificationClick 
}: NotificationCenterProps) => {
  const [open, setOpen] = useState(false);
  const { data: allNotifications = [], isLoading } = useNotifications(bitrixTelemarketingId);
  const { data: unreadNotifications = [] } = useUnreadNotifications(bitrixTelemarketingId);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const unreadCount = unreadNotifications.length;

  const handleNotificationClick = (notification: TelemarketingNotification) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    onNotificationClick?.(notification);
    setOpen(false);
  };

  const handleMarkAllAsRead = () => {
    if (bitrixTelemarketingId) {
      markAllAsRead.mutate(bitrixTelemarketingId);
    }
  };

  const renderNotification = (notification: TelemarketingNotification) => (
    <div
      key={notification.id}
      className={cn(
        "p-3 cursor-pointer hover:bg-accent/50 transition-colors",
        getNotificationBg(notification.type, notification.is_read)
      )}
      onClick={() => handleNotificationClick(notification)}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={cn(
              "text-sm truncate",
              !notification.is_read && "font-semibold"
            )}>
              {notification.title}
            </p>
            {!notification.is_read && (
              <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
            )}
          </div>
          {notification.message && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {notification.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.created_at), { 
              addSuffix: true, 
              locale: ptBR 
            })}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold">Notificações</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsRead.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>

        <Tabs defaultValue="unread" className="w-full">
          <TabsList className="w-full rounded-none border-b">
            <TabsTrigger value="unread" className="flex-1">
              Não lidas ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="all" className="flex-1">
              Todas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unread" className="m-0">
            <ScrollArea className="h-[300px]">
              {unreadNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                  <Check className="h-8 w-8 mb-2" />
                  <p className="text-sm">Nenhuma notificação</p>
                </div>
              ) : (
                <div className="divide-y">
                  {unreadNotifications.map(renderNotification)}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="all" className="m-0">
            <ScrollArea className="h-[300px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-[200px]">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : allNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2" />
                  <p className="text-sm">Nenhuma notificação</p>
                </div>
              ) : (
                <div className="divide-y">
                  {allNotifications.map(renderNotification)}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};

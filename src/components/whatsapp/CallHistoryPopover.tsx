import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { History, Phone, Clock, User, MessageSquare } from 'lucide-react';
import { useSipCallLogsByPhone, CALL_RESULT_LABELS, CALL_RESULT_COLORS, SipCallLog } from '@/hooks/useSipCallLogs';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface CallHistoryPopoverProps {
  phoneNumber?: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function CallLogItem({ log }: { log: SipCallLog }) {
  return (
    <div className="p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <Badge 
          variant="secondary" 
          className={`text-xs ${CALL_RESULT_COLORS[log.call_result]}`}
        >
          {CALL_RESULT_LABELS[log.call_result]}
        </Badge>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
        </span>
      </div>
      
      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
        <User className="w-3 h-3" />
        <span>{log.operator_name || 'Operador'}</span>
        {log.call_duration_seconds && (
          <>
            <span className="text-muted-foreground/50">•</span>
            <span>{formatDuration(log.call_duration_seconds)}</span>
          </>
        )}
      </div>
      
      {log.notes && (
        <div className="flex items-start gap-2 mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-2">{log.notes}</span>
        </div>
      )}
    </div>
  );
}

export function CallHistoryPopover({ phoneNumber }: CallHistoryPopoverProps) {
  const [open, setOpen] = useState(false);
  const { data: logs = [], isLoading } = useSipCallLogsByPhone(phoneNumber);

  if (!phoneNumber) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          title="Histórico de chamadas"
        >
          <History className="w-3.5 h-3.5" />
          Histórico
          {logs.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
              {logs.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b bg-muted/30">
          <h4 className="font-medium flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4" />
            Histórico de Chamadas
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {phoneNumber}
          </p>
        </div>
        
        <ScrollArea className="max-h-80">
          {isLoading ? (
            <div className="p-3 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma chamada registrada</p>
            </div>
          ) : (
            logs.map((log) => <CallLogItem key={log.id} log={log} />)
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

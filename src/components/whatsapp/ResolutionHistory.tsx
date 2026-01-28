import { CheckCircle2, User, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useResolutionHistory } from '@/hooks/useInternalNotes';
import { Skeleton } from '@/components/ui/skeleton';

interface ResolutionHistoryProps {
  phoneNumber: string;
}

export function ResolutionHistory({ phoneNumber }: ResolutionHistoryProps) {
  const { data: resolutions = [], isLoading } = useResolutionHistory(phoneNumber);

  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (resolutions.length === 0) {
    return null;
  }

  return (
    <div className="border-t bg-blue-50/30 dark:bg-blue-950/10">
      <div className="p-3 border-b bg-blue-100/50 dark:bg-blue-900/20">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-sm text-blue-800 dark:text-blue-200">
            Histórico de Resoluções
          </span>
          <Badge variant="secondary" className="text-xs bg-blue-200/50 dark:bg-blue-800/50">
            {resolutions.length}
          </Badge>
        </div>
      </div>

      <ScrollArea className="max-h-[200px]">
        <div className="p-3 space-y-2">
          {resolutions.map((resolution) => (
            <div
              key={resolution.id}
              className="p-2.5 rounded-lg border bg-blue-100/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
            >
              <div className="flex items-start gap-2">
                <div className="h-6 w-6 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5 text-blue-700 dark:text-blue-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      {resolution.operator_name || 'Operador'}
                    </span>
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      resolveu
                    </span>
                    {resolution.inviter_name && (
                      <span className="text-xs text-blue-500 dark:text-blue-500">
                        (convidado por {resolution.inviter_name})
                      </span>
                    )}
                  </div>
                  
                  {resolution.resolution_notes && (
                    <p className="text-sm text-blue-900 dark:text-blue-100 mt-1 bg-blue-50 dark:bg-blue-950/50 p-2 rounded border border-blue-200 dark:border-blue-800">
                      {resolution.resolution_notes}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-blue-600 dark:text-blue-400">
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatDistanceToNow(new Date(resolution.resolved_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                    <span className="opacity-50">
                      ({format(new Date(resolution.resolved_at), "dd/MM/yyyy HH:mm", { locale: ptBR })})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

/**
 * Alerts Overview Panel - Compact version
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function AlertsOverview() {
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts-overview-compact'],
    queryFn: async () => {
      const { count: syncErrors } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('has_sync_errors', true);

      const { count: pendingSync } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('sync_status', 'pending');

      return {
        critical: (syncErrors || 0) > 100 ? 1 : 0,
        warning: (pendingSync || 0) > 50 ? 1 : 0,
        info: 0,
      };
    },
    refetchInterval: 120000,
  });

  const total = (alerts?.critical || 0) + (alerts?.warning || 0) + (alerts?.info || 0);
  const hasAlerts = total > 0;

  return (
    <Card className={`h-full ${alerts?.critical ? 'border-destructive/50' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Alertas do Sistema
          </CardTitle>
          <Badge 
            variant={alerts?.critical ? 'destructive' : 'outline'} 
            className={`text-xs ${alerts?.critical ? 'animate-pulse' : ''}`}
          >
            {total} {total === 1 ? 'alerta' : 'alertas'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!hasAlerts ? (
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">Sistema estável</span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded bg-destructive/10">
              <AlertCircle className="h-4 w-4 text-destructive mx-auto mb-1" />
              <p className="text-lg font-bold text-destructive">{isLoading ? '-' : alerts?.critical}</p>
              <p className="text-[10px] text-muted-foreground">Críticos</p>
            </div>
            <div className="text-center p-2 rounded bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-yellow-500">{isLoading ? '-' : alerts?.warning}</p>
              <p className="text-[10px] text-muted-foreground">Avisos</p>
            </div>
            <div className="text-center p-2 rounded bg-primary/10">
              <Info className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-primary">{isLoading ? '-' : alerts?.info}</p>
              <p className="text-[10px] text-muted-foreground">Info</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

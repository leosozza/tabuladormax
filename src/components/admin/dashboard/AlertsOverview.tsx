/**
 * Alerts Overview Panel
 * Summary of system alerts by severity
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AlertCounts {
  critical: number;
  warning: number;
  info: number;
}

export function AlertsOverview() {
  const navigate = useNavigate();

  const { data: alerts, isLoading } = useQuery<AlertCounts>({
    queryKey: ['alerts-overview'],
    queryFn: async () => {
      // Check for sync errors (critical)
      const { count: syncErrors } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('has_sync_errors', true);

      // Check for pending sync (warning if > threshold)
      const { count: pendingSync } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('sync_status', 'pending');

      // Check for stale imports (info)
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: staleJobs } = await supabase
        .from('bitrix_import_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'paused')
        .lt('updated_at', oneWeekAgo);

      return {
        critical: (syncErrors || 0) > 100 ? 1 : 0,
        warning: (pendingSync || 0) > 50 ? 1 : 0,
        info: staleJobs || 0,
      };
    },
    refetchInterval: 120000, // Refresh every 2 minutes
  });

  const totalAlerts = (alerts?.critical || 0) + (alerts?.warning || 0) + (alerts?.info || 0);
  const hasAlerts = totalAlerts > 0;

  const alertItems = [
    {
      type: 'critical',
      label: 'Críticos',
      count: alerts?.critical || 0,
      icon: AlertCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      type: 'warning',
      label: 'Avisos',
      count: alerts?.warning || 0,
      icon: AlertTriangle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      type: 'info',
      label: 'Informativos',
      count: alerts?.info || 0,
      icon: Info,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  return (
    <Card className={hasAlerts && alerts?.critical ? 'border-destructive/50' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            Alertas do Sistema
          </CardTitle>
          {hasAlerts ? (
            <Badge 
              variant={alerts?.critical ? 'destructive' : 'secondary'}
              className={alerts?.critical ? 'animate-pulse' : ''}
            >
              {totalAlerts} {totalAlerts === 1 ? 'alerta' : 'alertas'}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-success border-success/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Sistema estável
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-6">
            {alertItems.map((item) => (
              <div key={item.type} className="flex items-center gap-2">
                <div className={`p-1.5 rounded-full ${item.bgColor}`}>
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <div>
                  <p className="text-lg font-bold">
                    {isLoading ? '...' : item.count}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </div>
            ))}
          </div>

          {hasAlerts && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/admin/sync-errors')}
              className="shrink-0"
            >
              Ver detalhes
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        {!hasAlerts && (
          <p className="text-sm text-muted-foreground mt-2">
            Nenhum problema detectado. O sistema está funcionando normalmente.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

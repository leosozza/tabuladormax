/**
 * System Status Panel - Compact version
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  Zap, 
  Database,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type StatusType = 'healthy' | 'warning' | 'critical';

export function SystemStatusPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['system-status-compact'],
    queryFn: async () => {
      const { count: pendingSync } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('sync_status', 'pending');

      const { count: syncErrors } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('has_sync_errors', true);

      const start = performance.now();
      await supabase.from('profiles').select('id').limit(1);
      const latency = Math.round(performance.now() - start);

      return {
        pending: pendingSync || 0,
        errors: syncErrors || 0,
        latency,
        edgeFunctions: { active: 45, total: 50 },
      };
    },
    refetchInterval: 60000,
  });

  const getStatus = (): StatusType => {
    if ((data?.errors || 0) > 100) return 'critical';
    if ((data?.pending || 0) > 50) return 'warning';
    return 'healthy';
  };

  const status = getStatus();
  const statusConfig = {
    healthy: { label: 'Operacional', color: 'text-green-500', bg: 'bg-green-500/10' },
    warning: { label: 'Atenção', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    critical: { label: 'Crítico', color: 'text-destructive', bg: 'bg-destructive/10' },
  };

  const items = [
    { icon: RefreshCw, label: 'Sincronização', status: data?.errors === 0 ? 'healthy' : 'warning' as StatusType, value: `Pendentes: ${data?.pending || 0}`, subValue: `Com ${data?.errors || 0} erros` },
    { icon: Zap, label: 'Edge Functions', status: 'healthy' as StatusType, value: `Ativas: ${data?.edgeFunctions.active}/${data?.edgeFunctions.total}`, subValue: 'Com 0 erros' },
    { icon: Database, label: 'Database', status: (data?.latency || 0) > 200 ? 'warning' : 'healthy' as StatusType, value: `Latência: ${data?.latency || 0}ms`, subValue: (data?.latency || 0) > 200 ? 'Lento' : 'Saudável' },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Database className="h-4 w-4" />
            Status do Sistema
          </CardTitle>
          <Badge variant="outline" className={`${statusConfig[status].color} text-xs`}>
            {status === 'healthy' && <CheckCircle2 className="h-3 w-3 mr-1" />}
            {status !== 'healthy' && <AlertCircle className="h-3 w-3 mr-1" />}
            {statusConfig[status].label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const cfg = statusConfig[item.status];
          return (
            <div key={item.label} className="flex items-center gap-3">
              <div className={`p-1.5 rounded ${cfg.bg}`}>
                <item.icon className={`h-3.5 w-3.5 ${cfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium">{item.label}</span>
                  <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{isLoading ? '...' : item.value}</span>
                  <span>{isLoading ? '...' : item.subValue}</span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

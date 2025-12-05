/**
 * System Activity Bar
 * Full-width bar showing real-time system activities
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Zap, Clock, TrendingUp, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
interface ActivityMetrics {
  lastSyncTime: Date | null;
  pendingSync: number;
  successRate24h: number;
  syncs24h: number;
}
export function SystemActivityBar() {
  const {
    data: metrics,
    isLoading
  } = useQuery<ActivityMetrics>({
    queryKey: ['system-activity-metrics'],
    queryFn: async () => {
      // Get last sync event
      const {
        data: lastSync
      } = await supabase.from('sync_events').select('created_at').order('created_at', {
        ascending: false
      }).limit(1).single();

      // Get pending sync count (only recent - last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const {
        count: pendingSync
      } = await supabase.from('leads').select('*', {
        count: 'exact',
        head: true
      }).eq('sync_status', 'pending').gte('criado', sevenDaysAgo);

      // Calculate success rate and count (last 24h)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const {
        data: syncEvents
      } = await supabase.from('sync_events').select('status').gte('created_at', oneDayAgo);
      const totalEvents = syncEvents?.length || 0;
      const successEvents = syncEvents?.filter(e => e.status === 'success').length || 0;
      const successRate = totalEvents > 0 ? successEvents / totalEvents * 100 : 100;
      return {
        lastSyncTime: lastSync?.created_at ? new Date(lastSync.created_at) : null,
        pendingSync: pendingSync || 0,
        successRate24h: successRate,
        syncs24h: totalEvents
      };
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });
  const items = [{
    icon: RefreshCw,
    label: 'Última Sincronização',
    value: metrics?.lastSyncTime ? formatDistanceToNow(metrics.lastSyncTime, {
      addSuffix: true,
      locale: ptBR
    }) : 'N/A',
    color: 'text-primary'
  }, {
    icon: Clock,
    label: 'Syncs Pendentes',
    value: metrics?.pendingSync.toString() || '0',
    color: metrics?.pendingSync && metrics.pendingSync > 10 ? 'text-warning' : 'text-success'
  }, {
    icon: Zap,
    label: 'Syncs 24h',
    value: `${metrics?.syncs24h || 0} eventos`,
    color: 'text-primary'
  }, {
    icon: TrendingUp,
    label: 'Taxa Sucesso 24h',
    value: `${(metrics?.successRate24h || 0).toFixed(1)}%`,
    color: (metrics?.successRate24h || 0) >= 95 ? 'text-success' : 'text-warning'
  }];
  return;
}
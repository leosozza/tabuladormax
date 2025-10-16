import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, CheckCircle2, XCircle, Zap } from "lucide-react";
import { subMinutes } from "date-fns";

export function MetricsCards() {
  const { data: metrics } = useQuery({
    queryKey: ['sync-metrics-realtime'],
    queryFn: async () => {
      const last60min = subMinutes(new Date(), 60);
      
      const { data: recent, error } = await supabase
        .from('sync_events')
        .select('status, sync_duration_ms')
        .gte('created_at', last60min.toISOString());
      
      console.log('📊 MetricsCards Query:', {
        count: recent?.length,
        error,
        timeRange: last60min.toISOString(),
        sample: recent?.slice(0, 3)
      });
      
      const total = recent?.length || 0;
      const success = recent?.filter(e => e.status === 'success').length || 0;
      const errors = recent?.filter(e => e.status === 'error').length || 0;
      const avgDuration = recent?.reduce((sum, e) => sum + (e.sync_duration_ms || 0), 0) / total || 0;
      
      return {
        total,
        success,
        errors,
        successRate: total > 0 ? (success / total * 100).toFixed(1) : '0',
        avgSpeed: total > 0 ? (total / 60).toFixed(1) : '0',
        avgDuration: avgDuration.toFixed(0)
      };
    },
    refetchInterval: 5000
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-full">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{metrics?.success || 0}</div>
              <p className="text-xs text-muted-foreground">Sucessos (1h)</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{metrics?.successRate || 0}%</div>
              <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/10 rounded-full">
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{metrics?.errors || 0}</div>
              <p className="text-xs text-muted-foreground">Falhas (1h)</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-full">
              <Zap className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{metrics?.avgSpeed || 0}/min</div>
              <p className="text-xs text-muted-foreground">Velocidade Média</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SyncMonitor() {
  const { data: stats } = useQuery({
    queryKey: ['sync-stats'],
    queryFn: async () => {
      const { data: leads, error } = await supabase
        .from('leads')
        .select('sync_status, sync_source')
        .order('updated_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      return {
        total: leads.length,
        synced: leads.filter(l => l.sync_status === 'synced').length,
        syncing: leads.filter(l => l.sync_status === 'syncing').length,
        pending: leads.filter(l => l.sync_status === 'pending').length,
        fromBitrix: leads.filter(l => l.sync_source === 'bitrix').length,
        fromSupabase: leads.filter(l => l.sync_source === 'supabase').length,
        fromCsv: leads.filter(l => l.sync_source === 'csv_import').length,
      };
    },
    refetchInterval: 5000
  });

  return (
    <Card className="p-4">
      <h3 className="font-bold mb-4">Status de Sincronização (últimos 1000 leads)</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{stats?.total || 0}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Sincronizados</p>
          <p className="text-2xl font-bold text-green-600">{stats?.synced || 0}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Sincronizando</p>
          <p className="text-2xl font-bold text-yellow-600">{stats?.syncing || 0}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Pendentes</p>
          <p className="text-2xl font-bold text-red-600">{stats?.pending || 0}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2 flex-wrap">
        <Badge variant="outline">Bitrix → Supabase: {stats?.fromBitrix || 0}</Badge>
        <Badge variant="outline">Supabase → Bitrix: {stats?.fromSupabase || 0}</Badge>
        <Badge variant="outline">CSV Import: {stats?.fromCsv || 0}</Badge>
      </div>
    </Card>
  );
}

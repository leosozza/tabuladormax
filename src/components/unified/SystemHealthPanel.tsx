import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, AlertCircle, Clock } from "lucide-react";

export function SystemHealthPanel() {
  const { data: syncStatus, isLoading } = useQuery({
    queryKey: ['sync-status'],
    queryFn: async () => {
      const { count: totalLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      const { count: syncErrors } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('has_sync_errors', true);

      const { count: pendingSync } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('sync_status', 'pending');

      return {
        totalLeads: totalLeads || 0,
        syncErrors: syncErrors || 0,
        pendingSync: pendingSync || 0,
        healthy: (syncErrors || 0) === 0 && (pendingSync || 0) === 0,
      };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status do Sistema</CardTitle>
          <CardDescription>Carregando informações...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status do Sistema</CardTitle>
        <CardDescription>Monitoramento de sincronização</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {syncStatus?.healthy ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">Sistema Operacional</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <span className="font-medium">Atenção Necessária</span>
              </>
            )}
          </div>
          <Badge variant={syncStatus?.healthy ? "default" : "secondary"}>
            {syncStatus?.healthy ? "Normal" : "Revisar"}
          </Badge>
        </div>

        <div className="space-y-2 pt-4 border-t">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Total de Leads</span>
            <span className="font-medium">{syncStatus?.totalLeads.toLocaleString('pt-BR')}</span>
          </div>
          
          {syncStatus && syncStatus.syncErrors > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                Erros de Sincronização
              </span>
              <span className="font-medium text-red-600">{syncStatus.syncErrors}</span>
            </div>
          )}

          {syncStatus && syncStatus.pendingSync > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                Pendentes de Sincronização
              </span>
              <span className="font-medium text-yellow-600">{syncStatus.pendingSync}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

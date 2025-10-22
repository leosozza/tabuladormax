import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle2, XCircle, Database } from "lucide-react";
import { subHours } from "date-fns";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export function GestaoScouterMetrics() {
  const [showErrors, setShowErrors] = useState(false);

  const { data: metrics } = useQuery({
    queryKey: ['gestao-scouter-metrics'],
    queryFn: async () => {
      const last24h = subHours(new Date(), 24);
      
      // Buscar eventos de sincronização com gestao-scouter
      const { data: events, error } = await supabase
        .from('sync_events')
        .select('status, direction, sync_duration_ms')
        .gte('created_at', last24h.toISOString())
        .in('direction', ['supabase_to_gestao_scouter', 'gestao_scouter_to_supabase']);
      
      console.log('📊 GestaoScouterMetrics Query:', {
        count: events?.length,
        error,
        sample: events?.slice(0, 3)
      });
      
      if (!events || events.length === 0) {
        return {
          total: 0,
          toGestao: 0,
          fromGestao: 0,
          success: 0,
          errors: 0,
          successRate: '0',
          avgDuration: '0'
        };
      }

      const total = events.length;
      const toGestao = events.filter(e => e.direction === 'supabase_to_gestao_scouter').length;
      const fromGestao = events.filter(e => e.direction === 'gestao_scouter_to_supabase').length;
      const success = events.filter(e => e.status === 'success').length;
      const errors = events.filter(e => e.status === 'error').length;
      const avgDuration = events.reduce((sum, e) => sum + (e.sync_duration_ms || 0), 0) / total || 0;
      
      return {
        total,
        toGestao,
        fromGestao,
        success,
        errors,
        successRate: total > 0 ? (success / total * 100).toFixed(1) : '0',
        avgDuration: avgDuration.toFixed(0)
      };
    },
    refetchInterval: 10000
  });

  // Verificar se a sincronização está habilitada
  const { data: config } = useQuery({
    queryKey: ['gestao-scouter-config'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gestao_scouter_config')
        .select('active, sync_enabled')
        .eq('active', true)
        .maybeSingle();
      
      return data;
    },
    refetchInterval: 30000
  });

  const isEnabled = config?.active && config?.sync_enabled;

  // Buscar erros de sincronização detalhados
  const { data: errors } = useQuery({
    queryKey: ['gestao-scouter-errors'],
    queryFn: async () => {
      const last24h = subHours(new Date(), 24);
      
      const { data, error } = await supabase
        .from('sync_events')
        .select('*')
        .eq('status', 'error')
        .in('direction', ['supabase_to_gestao_scouter', 'gestao_scouter_to_supabase'])
        .gte('created_at', last24h.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
    enabled: showErrors,
    refetchInterval: 10000
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sincronização com Gestão Scouter</h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-sm text-muted-foreground">
            {isEnabled ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{metrics?.success || 0}</div>
                <p className="text-xs text-muted-foreground">Sucessos (24h)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setShowErrors(true)}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-full">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{metrics?.errors || 0}</div>
                <p className="text-xs text-muted-foreground">Falhas (24h)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-full">
                <Database className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{metrics?.toGestao || 0}</div>
                <p className="text-xs text-muted-foreground">→ Gestão Scouter</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-full">
                <Activity className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{metrics?.fromGestao || 0}</div>
                <p className="text-xs text-muted-foreground">← Gestão Scouter</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showErrors} onOpenChange={setShowErrors}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Erros de Sincronização - Gestão Scouter (últimas 24h)</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            {!errors || errors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum erro encontrado nas últimas 24 horas
              </div>
            ) : (
              <div className="space-y-4">
                {errors.map((error) => (
                  <Card key={error.id} className="border-red-200">
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="destructive" className="text-xs">
                                {error.direction === 'supabase_to_gestao_scouter' 
                                  ? '→ Gestão Scouter' 
                                  : '← Gestão Scouter'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                Lead ID: {error.lead_id}
                              </Badge>
                            </div>
                            
                            <div className="text-xs text-muted-foreground mb-2">
                              {new Date(error.created_at).toLocaleString('pt-BR')}
                              {error.sync_duration_ms && (
                                <span className="ml-2">
                                  • Duração: {error.sync_duration_ms}ms
                                </span>
                              )}
                            </div>

                            <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-md">
                              <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                                Erro:
                              </p>
                              <p className="text-sm text-red-700 dark:text-red-300 font-mono whitespace-pre-wrap">
                                {error.error_message || 'Erro desconhecido'}
                              </p>
                            </div>

                            <div className="mt-2 text-xs">
                              <span className="font-medium">Tipo:</span> {error.event_type}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

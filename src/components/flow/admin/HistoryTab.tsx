// ============================================
// History Tab - Flow execution history
// ============================================

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle, Clock, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FlowRunRow {
  id: string;
  flow_id: string | null;
  lead_id: number | null;
  phone_number: string | null;
  trigger_type: string | null;
  trigger_value: string | null;
  status: string;
  logs: unknown[];
  resultado: unknown;
  started_at: string;
  completed_at: string | null;
  flows?: { nome: string } | null;
}

interface LogEntry {
  timestamp: string;
  stepId: string;
  stepNome: string;
  level: string;
  message: string;
  data?: unknown;
}

export function HistoryTab() {
  const [runs, setRuns] = useState<FlowRunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<FlowRunRow | null>(null);

  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('flows_runs')
        .select('*, flows(nome)')
        .order('started_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      const typedRuns = (data || []).map(r => ({
        ...r,
        logs: (r.logs as unknown[]) || []
      })) as FlowRunRow[];
      setRuns(typedRuns);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <Play className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      failed: "destructive",
      running: "secondary",
      pending: "outline",
    };
    const labels: Record<string, string> = {
      completed: "Concluído",
      failed: "Falhou",
      running: "Executando",
      pending: "Pendente",
    };
    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
  };

  const getDuration = (start: string, end: string | null) => {
    if (!end) return "Em andamento";
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Carregando histórico...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Histórico de Execuções</CardTitle>
            <CardDescription>
              Últimas 100 execuções de flows
            </CardDescription>
          </div>
          <Button variant="outline" onClick={loadRuns}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p>Nenhuma execução registrada ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedRun(run)}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(run.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {run.flows?.nome || 'Flow removido'}
                        </span>
                        {getStatusBadge(run.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {run.trigger_type && `${run.trigger_type}: ${run.trigger_value || '-'} • `}
                        {run.lead_id && `Lead: ${run.lead_id} • `}
                        {run.phone_number && `Tel: ${run.phone_number}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{formatDate(run.started_at)}</p>
                    <p className="text-xs">{getDuration(run.started_at, run.completed_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedRun} onOpenChange={() => setSelectedRun(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Detalhes da Execução
            </DialogTitle>
          </DialogHeader>

          {selectedRun && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Flow</p>
                  <p className="font-medium">{selectedRun.flows?.nome || 'Flow removido'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {getStatusBadge(selectedRun.status)}
                </div>
                <div>
                  <p className="text-muted-foreground">Início</p>
                  <p>{formatDate(selectedRun.started_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duração</p>
                  <p>{getDuration(selectedRun.started_at, selectedRun.completed_at)}</p>
                </div>
                {selectedRun.trigger_type && (
                  <>
                    <div>
                      <p className="text-muted-foreground">Gatilho</p>
                      <p>{selectedRun.trigger_type}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Valor</p>
                      <p>{selectedRun.trigger_value || '-'}</p>
                    </div>
                  </>
                )}
                {selectedRun.lead_id && (
                  <div>
                    <p className="text-muted-foreground">Lead ID</p>
                    <p>{selectedRun.lead_id}</p>
                  </div>
                )}
                {selectedRun.phone_number && (
                  <div>
                    <p className="text-muted-foreground">Telefone</p>
                    <p>{selectedRun.phone_number}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Logs de Execução</p>
                <ScrollArea className="h-[300px] border rounded-lg p-3">
                  <div className="space-y-2 font-mono text-xs">
                    {(selectedRun.logs as LogEntry[] || []).map((log, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded ${
                          log.level === 'error'
                            ? 'bg-destructive/10 text-destructive'
                            : log.level === 'success'
                            ? 'bg-green-500/10 text-green-600'
                            : log.level === 'warning'
                            ? 'bg-yellow-500/10 text-yellow-600'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">[{log.stepNome}]</span>
                          <span className="text-muted-foreground">
                            {format(new Date(log.timestamp), "HH:mm:ss.SSS")}
                          </span>
                        </div>
                        <p>{log.message}</p>
                        {log.data && (
                          <pre className="mt-1 text-[10px] overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

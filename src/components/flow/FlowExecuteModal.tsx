// ============================================
// Flow Execute Modal - Execute Flow with Context
// ============================================

import { useState } from "react";
import { Play, X, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Flow, FlowRun, FlowLogEntry } from "@/types/flow";

interface FlowExecuteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flow: Flow | null;
  leadId?: number;
  onComplete?: () => void;
}

export function FlowExecuteModal({ open, onOpenChange, flow, leadId: propLeadId, onComplete }: FlowExecuteModalProps) {
  const [leadId, setLeadId] = useState(propLeadId?.toString() || "");
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<FlowRun | null>(null);

  const handleExecute = async () => {
    if (!flow) return;

    const leadIdNumber = leadId ? parseInt(leadId) : undefined;

    setExecuting(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('flows-executor', {
        body: {
          flowId: flow.id,
          leadId: leadIdNumber,
          context: {}
        }
      });

      if (error) throw error;

      setResult(data as FlowRun);

      if (data.status === 'completed') {
        toast.success("Flow executado com sucesso!");
      } else {
        toast.error("Flow falhou durante execução");
      }

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Erro ao executar flow:", error);
      toast.error("Erro ao executar flow");
    } finally {
      setExecuting(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setLeadId(propLeadId?.toString() || "");
    onOpenChange(false);
  };

  if (!flow) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Executar Flow: {flow.nome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden">
          {!result && (
            <>
              {flow.descricao && (
                <p className="text-sm text-muted-foreground">{flow.descricao}</p>
              )}

              <div className="space-y-2">
                <Label>ID do Lead (opcional)</Label>
                <Input
                  type="number"
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                  placeholder="Ex: 12345"
                  disabled={executing}
                />
                <p className="text-xs text-muted-foreground">
                  Informe o ID do lead para executar ações específicas. Deixe em branco para testes.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Steps do Flow ({flow.steps.length})</Label>
                <ScrollArea className="h-48 border rounded-md p-3">
                  <div className="space-y-2">
                    {flow.steps.map((step, index) => (
                      <div key={step.id} className="flex items-center gap-2 text-sm">
                        <span className="font-mono text-muted-foreground">#{index + 1}</span>
                        <Badge variant="outline" className="text-xs">
                          {step.type}
                        </Badge>
                        <span>{step.nome}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {result.status === 'completed' ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-500" />
                )}
                <div>
                  <p className="font-semibold">
                    {result.status === 'completed' ? 'Execução Concluída' : 'Execução Falhou'}
                  </p>
                  <p className="text-sm text-muted-foreground">Run ID: {result.id}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Logs de Execução</Label>
                <ScrollArea className="h-64 border rounded-md p-3 bg-muted/30">
                  <div className="space-y-2 font-mono text-xs">
                    {result.logs.map((log: FlowLogEntry, index: number) => (
                      <div
                        key={index}
                        className={`p-2 rounded ${
                          log.level === 'error'
                            ? 'bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100'
                            : log.level === 'success'
                            ? 'bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100'
                            : log.level === 'warning'
                            ? 'bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-muted-foreground shrink-0">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="font-semibold shrink-0">[{log.level.toUpperCase()}]</span>
                          <span className="break-all">{log.message}</span>
                        </div>
                        {log.data && (
                          <pre className="mt-1 text-xs overflow-x-auto">
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
        </div>

        <DialogFooter className="gap-2">
          {!result ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={executing}>
                <X className="w-4 h-4 mr-1" /> Cancelar
              </Button>
              <Button onClick={handleExecute} disabled={executing}>
                {executing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Executando...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-1" /> Executar
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

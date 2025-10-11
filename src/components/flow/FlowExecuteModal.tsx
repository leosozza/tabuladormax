import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Flow } from "@/types/flow";

interface FlowExecuteModalProps {
  flow: Flow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExecuteResponse {
  run?: { id: string };
}

export function FlowExecuteModal({ flow, open, onOpenChange }: FlowExecuteModalProps) {
  const [inputText, setInputText] = useState("{\n  \"leadId\": 0\n}");
  const [running, setRunning] = useState(false);
  const [lastRunId, setLastRunId] = useState<string | null>(null);

  useEffect(() => {
    if (flow) {
      setInputText(JSON.stringify({ leadId: 0 }, null, 2));
      setLastRunId(null);
    }
  }, [flow]);

  const handleExecute = async () => {
    if (!flow) return;
    let parsed: any;

    try {
      parsed = JSON.parse(inputText);
    } catch (error) {
      toast.error("JSON inválido de entrada");
      return;
    }

    setRunning(true);
    const { data, error } = await supabase.functions.invoke<ExecuteResponse>("flows-api", {
      body: {
        input: parsed,
      },
      headers: {
        "x-flow-path": `/${flow.id}/execute`,
      },
      method: "POST",
    });
    setRunning(false);

    if (error) {
      console.error("Erro ao executar fluxo", error);
      toast.error("Falha ao iniciar execução do fluxo");
      return;
    }

    if (data?.run) {
      toast.success("Execução criada com sucesso");
      setLastRunId(data.run.id);
    } else {
      toast.error("Não foi possível obter o ID da execução");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Executar fluxo manualmente</DialogTitle>
        </DialogHeader>

        {flow ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold">{flow.name}</p>
              <p className="text-xs text-muted-foreground">
                Defina a entrada que será enviada para o executor.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Payload de entrada (JSON)</Label>
              <Textarea
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                rows={10}
                className="font-mono text-xs"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={running}>
                Fechar
              </Button>
              <Button onClick={handleExecute} disabled={running}>
                {running ? "Executando..." : "Executar"}
              </Button>
            </div>

            {lastRunId && (
              <ScrollArea className="max-h-32 rounded border p-3 bg-muted/30">
                <p className="text-xs">Run ID: {lastRunId}</p>
                <p className="text-xs text-muted-foreground">
                  Acompanhe o status do run na tabela de execuções ou na aba de logs.
                </p>
              </ScrollArea>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Selecione um fluxo para executar.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default FlowExecuteModal;

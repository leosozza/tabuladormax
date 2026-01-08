import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Loader2, Workflow, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Flow {
  id: string;
  nome: string;
  descricao: string | null;
}

interface WhatsAppFlowSelectorProps {
  phoneNumber?: string;
  bitrixId?: string;
  disabled?: boolean;
}

export function WhatsAppFlowSelector({ phoneNumber, bitrixId, disabled }: WhatsAppFlowSelectorProps) {
  const [executingFlowId, setExecutingFlowId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ flowId: string; success: boolean } | null>(null);

  const { data: flows, isLoading } = useQuery({
    queryKey: ['active-flows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flows')
        .select('id, nome, descricao')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      return data as Flow[];
    },
  });

  const handleExecuteFlow = async (flow: Flow) => {
    if (!phoneNumber && !bitrixId) {
      toast.error('Número de telefone ou ID do lead não disponível');
      return;
    }

    setExecutingFlowId(flow.id);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('flows-executor', {
        body: {
          flowId: flow.id,
          phoneNumber,
          bitrixId,
          context: { source: 'whatsapp_chat' },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Flow "${flow.nome}" executado com sucesso`);
        setLastResult({ flowId: flow.id, success: true });
      } else {
        toast.error(data?.error || 'Erro ao executar flow');
        setLastResult({ flowId: flow.id, success: false });
      }
    } catch (err) {
      console.error('Erro ao executar flow:', err);
      toast.error('Erro ao executar flow');
      setLastResult({ flowId: flow.id, success: false });
    } finally {
      setExecutingFlowId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!flows || flows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Workflow className="w-12 h-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Nenhum flow ativo disponível</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        <p className="text-sm text-muted-foreground mb-4">
          Selecione um flow para executar nesta conversa:
        </p>

        {flows.map((flow) => {
          const isExecuting = executingFlowId === flow.id;
          const result = lastResult?.flowId === flow.id ? lastResult : null;

          return (
            <div
              key={flow.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{flow.nome}</p>
                {flow.descricao && (
                  <p className="text-xs text-muted-foreground truncate">{flow.descricao}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {result && (
                  result.success ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExecuteFlow(flow)}
                  disabled={disabled || isExecuting}
                >
                  {isExecuting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

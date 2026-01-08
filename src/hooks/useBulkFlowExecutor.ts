import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface LeadResult {
  leadId: number;
  success: boolean;
  runId?: string;
  error?: string;
}

interface ExecutionState {
  isExecuting: boolean;
  progress: { current: number; total: number };
  results: LeadResult[];
  successCount: number;
  failedCount: number;
}

export function useBulkFlowExecutor() {
  const [state, setState] = useState<ExecutionState>({
    isExecuting: false,
    progress: { current: 0, total: 0 },
    results: [],
    successCount: 0,
    failedCount: 0,
  });

  const executeBulkFlow = useCallback(async (flowId: string, leadIds: number[]) => {
    if (leadIds.length === 0) {
      toast({
        title: 'Nenhum lead selecionado',
        description: 'Selecione pelo menos um lead para enviar o flow.',
        variant: 'destructive',
      });
      return;
    }

    setState({
      isExecuting: true,
      progress: { current: 0, total: leadIds.length },
      results: [],
      successCount: 0,
      failedCount: 0,
    });

    try {
      // Dividir em batches de 100 se necessário
      const batchSize = 100;
      const batches: number[][] = [];
      
      for (let i = 0; i < leadIds.length; i += batchSize) {
        batches.push(leadIds.slice(i, i + batchSize));
      }

      let allResults: LeadResult[] = [];
      let successTotal = 0;
      let failedTotal = 0;
      let processed = 0;

      for (const batch of batches) {
        const { data, error } = await supabase.functions.invoke('bulk-flow-executor', {
          body: { flowId, leadIds: batch },
        });

        if (error) {
          console.error('Erro no batch:', error);
          // Marcar todos do batch como falha
          const failedResults = batch.map(id => ({
            leadId: id,
            success: false,
            error: error.message,
          }));
          allResults = [...allResults, ...failedResults];
          failedTotal += batch.length;
        } else {
          allResults = [...allResults, ...(data.results || [])];
          successTotal += data.success || 0;
          failedTotal += data.failed || 0;
        }

        processed += batch.length;
        setState(prev => ({
          ...prev,
          progress: { current: processed, total: leadIds.length },
          results: allResults,
          successCount: successTotal,
          failedCount: failedTotal,
        }));
      }

      setState(prev => ({
        ...prev,
        isExecuting: false,
      }));

      toast({
        title: 'Envio em lote concluído',
        description: `${successTotal} sucesso, ${failedTotal} falha de ${leadIds.length} leads.`,
        variant: failedTotal === 0 ? 'default' : 'destructive',
      });

    } catch (error) {
      console.error('Erro no envio em lote:', error);
      setState(prev => ({
        ...prev,
        isExecuting: false,
      }));
      
      toast({
        title: 'Erro no envio em lote',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isExecuting: false,
      progress: { current: 0, total: 0 },
      results: [],
      successCount: 0,
      failedCount: 0,
    });
  }, []);

  return {
    ...state,
    executeBulkFlow,
    reset,
  };
}

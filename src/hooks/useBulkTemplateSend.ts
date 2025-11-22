import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BulkSendResult {
  conversation_id: number;
  success: boolean;
  error?: string;
}

interface BulkSendResponse {
  results: BulkSendResult[];
  total_sent: number;
  total_failed: number;
}

export function useBulkTemplateSend() {
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BulkSendResult[]>([]);

  const sendBulkTemplate = async (
    conversationIds: number[],
    templateId: string,
    variables: string[]
  ): Promise<BulkSendResponse | null> => {
    if (conversationIds.length === 0) {
      toast.error('Nenhuma conversa selecionada');
      return null;
    }

    setSending(true);
    setProgress(0);
    setResults([]);

    try {
      const { data, error } = await supabase.functions.invoke('chatwoot-bulk-send-template', {
        body: {
          conversation_ids: conversationIds,
          template_id: templateId,
          variables,
        },
      });

      if (error) throw error;

      const response = data as BulkSendResponse;
      setResults(response.results);
      setProgress(100);

      if (response.total_failed === 0) {
        toast.success(`✅ Templates enviados com sucesso para ${response.total_sent} conversas`);
      } else if (response.total_sent === 0) {
        toast.error(`❌ Falha ao enviar para todas as ${response.total_failed} conversas`);
      } else {
        toast.warning(
          `⚠️ Enviado para ${response.total_sent} conversas. ${response.total_failed} falharam.`
        );
      }

      return response;
    } catch (error) {
      console.error('Erro no envio em lote:', error);
      toast.error('Erro ao enviar templates em lote');
      return null;
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setProgress(0);
    setResults([]);
  };

  return {
    sending,
    progress,
    results,
    sendBulkTemplate,
    reset,
  };
}

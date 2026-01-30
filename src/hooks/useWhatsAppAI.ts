import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  direction: 'inbound' | 'outbound';
  content: string;
  sender_name?: string;
}

interface GenerateResponseResult {
  response: string | null;
  agentName: string | null;
  modelUsed: string | null;
  error?: string;
  errorType?: string;
}

interface ImproveTextResult {
  response: string | null;
  modelUsed: string | null;
  error?: string;
  errorType?: string;
}

interface UseWhatsAppAIReturn {
  generateResponse: (messages: Message[], context?: string, operatorBitrixId?: number, profileId?: string) => Promise<GenerateResponseResult>;
  improveText: (text: string, context?: string, operatorBitrixId?: number, profileId?: string) => Promise<ImproveTextResult>;
  isGenerating: boolean;
  isImproving: boolean;
}

// Traduz tipos de erro para mensagens amigáveis
function getErrorMessage(error: string, errorType?: string): string {
  switch (errorType) {
    case 'rate_limit':
      return '⏳ Limite de requisições excedido. Aguarde alguns segundos e tente novamente.';
    case 'credits':
      return '💳 Créditos insuficientes nos provedores de IA. Contate o administrador.';
    case 'timeout':
      return '⏱️ Tempo esgotado ao conectar com IA. Tente novamente.';
    case 'config':
      return '⚙️ Provedores de IA não configurados. Contate o administrador.';
    default:
      return error || 'Erro ao processar com IA';
  }
}

export function useWhatsAppAI(): UseWhatsAppAIReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);

  const generateResponse = useCallback(async (
    messages: Message[], 
    context?: string,
    operatorBitrixId?: number,
    profileId?: string
  ): Promise<GenerateResponseResult> => {
    setIsGenerating(true);
    try {
      const MAX_CONTEXT_MESSAGES = 50;
      const { data, error } = await supabase.functions.invoke('whatsapp-ai-assist', {
        body: {
          action: 'generate',
          messages: messages.slice(-MAX_CONTEXT_MESSAGES).map(m => ({
            role: m.direction === 'inbound' ? 'user' : 'assistant',
            content: m.content,
          })),
          context,
          operatorBitrixId,
          profileId,
        },
      });

      if (error) {
        console.error('Erro ao gerar resposta:', error);
        const errorMessage = getErrorMessage(error.message, data?.error_type);
        toast.error(errorMessage);
        return { 
          response: null, 
          agentName: null, 
          modelUsed: null,
          error: errorMessage,
          errorType: data?.error_type,
        };
      }

      // Verifica se a resposta contém erro
      if (data?.error) {
        const errorMessage = getErrorMessage(data.error, data.error_type);
        toast.error(errorMessage);
        return { 
          response: null, 
          agentName: null, 
          modelUsed: null,
          error: errorMessage,
          errorType: data.error_type,
        };
      }

      return { 
        response: data?.response || null,
        agentName: data?.agent_name || null,
        modelUsed: data?.model_used || null
      };
    } catch (err) {
      console.error('Erro ao gerar resposta:', err);
      const errorMessage = '❌ Erro ao conectar com IA. Verifique sua conexão.';
      toast.error(errorMessage);
      return { 
        response: null, 
        agentName: null, 
        modelUsed: null,
        error: errorMessage,
      };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const improveText = useCallback(async (
    text: string, 
    context?: string,
    operatorBitrixId?: number,
    profileId?: string
  ): Promise<ImproveTextResult> => {
    setIsImproving(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-ai-assist', {
        body: {
          action: 'improve',
          text,
          context,
          operatorBitrixId,
          profileId,
        },
      });

      if (error) {
        console.error('Erro ao melhorar texto:', error);
        const errorMessage = getErrorMessage(error.message, data?.error_type);
        toast.error(errorMessage);
        return { 
          response: null, 
          modelUsed: null,
          error: errorMessage,
          errorType: data?.error_type,
        };
      }

      // Verifica se a resposta contém erro
      if (data?.error) {
        const errorMessage = getErrorMessage(data.error, data.error_type);
        toast.error(errorMessage);
        return { 
          response: null, 
          modelUsed: null,
          error: errorMessage,
          errorType: data.error_type,
        };
      }

      return { 
        response: data?.response || null,
        modelUsed: data?.model_used || null
      };
    } catch (err) {
      console.error('Erro ao melhorar texto:', err);
      const errorMessage = '❌ Erro ao conectar com IA. Verifique sua conexão.';
      toast.error(errorMessage);
      return { 
        response: null, 
        modelUsed: null,
        error: errorMessage,
      };
    } finally {
      setIsImproving(false);
    }
  }, []);

  return {
    generateResponse,
    improveText,
    isGenerating,
    isImproving,
  };
}

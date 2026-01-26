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
}

interface UseWhatsAppAIReturn {
  generateResponse: (messages: Message[], context?: string, operatorBitrixId?: number, profileId?: string) => Promise<GenerateResponseResult>;
  improveText: (text: string, context?: string, operatorBitrixId?: number, profileId?: string) => Promise<string | null>;
  isGenerating: boolean;
  isImproving: boolean;
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
      const { data, error } = await supabase.functions.invoke('whatsapp-ai-assist', {
        body: {
          action: 'generate',
          messages: messages.slice(-10).map(m => ({
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
        toast.error('Erro ao gerar resposta com IA');
        return { response: null, agentName: null };
      }

      return { 
        response: data?.response || null,
        agentName: data?.agent_name || null
      };
    } catch (err) {
      console.error('Erro ao gerar resposta:', err);
      toast.error('Erro ao conectar com IA');
      return { response: null, agentName: null };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const improveText = useCallback(async (
    text: string, 
    context?: string,
    operatorBitrixId?: number,
    profileId?: string
  ): Promise<string | null> => {
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
        toast.error('Erro ao melhorar texto com IA');
        return null;
      }

      return data?.response || null;
    } catch (err) {
      console.error('Erro ao melhorar texto:', err);
      toast.error('Erro ao conectar com IA');
      return null;
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

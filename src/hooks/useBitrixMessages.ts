import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BitrixMessage {
  id: number;
  content: string;
  message_type: 'incoming' | 'outgoing';
  created_at: number;
  sender?: {
    id: number;
    name: string;
    type: string;
  };
}

export const useBitrixMessages = (
  sessionId: number | null, 
  chatId: string | null,
  leadId: string
) => {
  const [messages, setMessages] = useState<BitrixMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchMessages = async () => {
    if (!sessionId) return;
    
    setLoading(true);
    try {
      console.log('📥 Fetching Bitrix messages for session:', sessionId);
      
      const { data, error } = await supabase.functions.invoke(
        'bitrix-openline-messages',
        {
          body: {
            action: 'fetch',
            sessionId
          }
        }
      );

      if (error) throw error;
      
      console.log('✅ Bitrix messages loaded:', data.messages?.length || 0);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens do Bitrix:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!chatId || !content.trim()) return;

    setSending(true);
    try {
      console.log('📤 Sending message to Bitrix:', { chatId, leadId });
      
      const { data, error } = await supabase.functions.invoke(
        'bitrix-openline-messages',
        {
          body: {
            action: 'send',
            chatId,
            leadId,
            message: content
          }
        }
      );

      if (error) throw error;

      console.log('✅ Message sent to Bitrix:', data.messageId);

      // Adicionar mensagem otimisticamente
      const newMessage: BitrixMessage = {
        id: data.messageId || Date.now(),
        content,
        message_type: 'outgoing',
        created_at: Date.now() / 1000,
        sender: {
          id: 7,
          name: 'Você',
          type: 'user'
        }
      };

      setMessages(prev => [...prev, newMessage]);
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem para Bitrix:', error);
      throw error;
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchMessages();
    }
  }, [sessionId]);

  return {
    messages,
    loading,
    sending,
    sendMessage,
    refreshMessages: fetchMessages
  };
};

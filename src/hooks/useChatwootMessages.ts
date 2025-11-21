import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ChatwootMessage {
  id: number;
  content: string;
  message_type: 'incoming' | 'outgoing';
  created_at: number;
  sender?: {
    id: number;
    name: string;
    type: string;
  };
  attachments?: Array<{
    file_type: string;
    data_url: string;
  }>;
}

export interface TemplateParams {
  name: string;
  namespace: string;
  language: string;
  parameters?: Array<{ type: string; text: string }>;
}

export const useChatwootMessages = (conversationId: number | null) => {
  const [messages, setMessages] = useState<ChatwootMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchMessages = async () => {
    if (!conversationId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('chatwoot-messages', {
        body: {
          conversation_id: conversationId,
          action: 'fetch',
        },
      });

      if (error) throw error;

      // Ensure messages is always an array - access payload from Chatwoot response
      const fetchedMessages = data?.messages?.payload;
      setMessages(Array.isArray(fetchedMessages) ? fetchedMessages : []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!conversationId || !content.trim()) return;

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('chatwoot-messages', {
        body: {
          conversation_id: conversationId,
          content: content.trim(),
        },
      });

      if (error) throw error;

      // Add message optimistically
      const newMessage: ChatwootMessage = {
        id: Date.now(),
        content: content.trim(),
        message_type: 'outgoing',
        created_at: Date.now() / 1000,
        sender: {
          id: 0,
          name: 'Você',
          type: 'user',
        },
      };

      setMessages(prev => [...prev, newMessage]);
      toast.success('Mensagem enviada');
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
      return false;
    } finally {
      setSending(false);
    }
  };

  const sendTemplate = async (templateParams: TemplateParams) => {
    if (!conversationId) return;

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('chatwoot-messages', {
        body: {
          conversation_id: conversationId,
          template_params: templateParams,
        },
      });

      if (error) throw error;

      toast.success('Template enviado');
      await fetchMessages(); // Refresh to show template
      return true;
    } catch (error) {
      console.error('Error sending template:', error);
      toast.error('Erro ao enviar template');
      return false;
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
    }
  }, [conversationId]);

  return {
    messages,
    loading,
    sending,
    fetchMessages,
    sendMessage,
    sendTemplate,
  };
};

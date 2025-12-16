import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WhatsAppMessage {
  id: string;
  phone_number: string;
  bitrix_id: string | null;
  conversation_id: number | null;
  gupshup_message_id: string | null;
  direction: 'inbound' | 'outbound';
  message_type: string;
  content: string | null;
  template_name: string | null;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'enqueued';
  sent_by: 'bitrix' | 'tabulador' | 'operador' | 'gupshup' | null;
  sender_name: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
}

export interface TemplateParams {
  templateId: string;
  variables: string[];
}

interface UseWhatsAppMessagesOptions {
  bitrixId?: string;
  phoneNumber?: string;
  conversationId?: number;
}

export const useWhatsAppMessages = (options: UseWhatsAppMessagesOptions) => {
  const { bitrixId, phoneNumber, conversationId } = options;
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!bitrixId && !phoneNumber && !conversationId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('whatsapp_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (bitrixId) {
        query = query.eq('bitrix_id', bitrixId);
      } else if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      } else if (phoneNumber) {
        const normalizedPhone = phoneNumber.replace(/\D/g, '');
        query = query.eq('phone_number', normalizedPhone);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar mensagens:', error);
        toast.error('Erro ao carregar mensagens');
        return;
      }

      setMessages((data || []) as WhatsAppMessage[]);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  }, [bitrixId, phoneNumber, conversationId]);

  const sendMessage = async (content: string): Promise<boolean> => {
    if (!phoneNumber || !content.trim()) {
      toast.error('Telefone e mensagem são obrigatórios');
      return false;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('gupshup-send-message', {
        body: {
          action: 'send_message',
          phone_number: phoneNumber,
          message: content.trim(),
          bitrix_id: bitrixId,
          conversation_id: conversationId,
        },
      });

      if (error) {
        console.error('Erro ao enviar mensagem:', error);
        toast.error('Erro ao enviar mensagem');
        return false;
      }

      if (data?.error) {
        console.error('Erro da API:', data.error);
        toast.error(data.error);
        return false;
      }

      // Adicionar mensagem otimisticamente
      const newMessage: WhatsAppMessage = {
        id: crypto.randomUUID(),
        phone_number: phoneNumber.replace(/\D/g, ''),
        bitrix_id: bitrixId || null,
        conversation_id: conversationId || null,
        gupshup_message_id: data?.messageId || null,
        direction: 'outbound',
        message_type: 'text',
        content: content.trim(),
        template_name: null,
        status: 'sent',
        sent_by: 'tabulador',
        sender_name: 'Você',
        media_url: null,
        media_type: null,
        created_at: new Date().toISOString(),
        delivered_at: null,
        read_at: null,
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

  const sendTemplate = async (templateParams: TemplateParams): Promise<boolean> => {
    if (!phoneNumber) {
      toast.error('Telefone é obrigatório');
      return false;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('gupshup-send-message', {
        body: {
          action: 'send_template',
          phone_number: phoneNumber,
          template_id: templateParams.templateId,
          variables: templateParams.variables,
          bitrix_id: bitrixId,
          conversation_id: conversationId,
        },
      });

      if (error) {
        console.error('Erro ao enviar template:', error);
        toast.error('Erro ao enviar template');
        return false;
      }

      if (data?.error) {
        console.error('Erro da API:', data.error);
        toast.error(data.error);
        return false;
      }

      toast.success('Template enviado');
      await fetchMessages(); // Atualizar para mostrar o template
      return true;
    } catch (error) {
      console.error('Error sending template:', error);
      toast.error('Erro ao enviar template');
      return false;
    } finally {
      setSending(false);
    }
  };

  // Buscar mensagens iniciais
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Subscription realtime para novas mensagens
  useEffect(() => {
    if (!bitrixId && !phoneNumber && !conversationId) return;

    const channel = supabase
      .channel(`whatsapp-messages-${bitrixId || phoneNumber || conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: bitrixId 
            ? `bitrix_id=eq.${bitrixId}` 
            : conversationId 
              ? `conversation_id=eq.${conversationId}` 
              : undefined,
        },
        (payload) => {
          console.log('📨 Realtime update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as WhatsAppMessage;
            setMessages(prev => {
              // Evitar duplicatas
              if (prev.some(m => m.id === newMsg.id || m.gupshup_message_id === newMsg.gupshup_message_id)) {
                return prev;
              }
              return [...prev, newMsg];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as WhatsAppMessage;
            setMessages(prev =>
              prev.map(m => m.id === updatedMsg.id ? updatedMsg : m)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bitrixId, phoneNumber, conversationId]);

  // Marcar mensagens como lidas
  const markAsRead = useCallback(async (messageIds?: string[]) => {
    if (!bitrixId && !phoneNumber && !conversationId) return;

    try {
      // Marcar localmente primeiro (otimístico)
      setMessages(prev => 
        prev.map(msg => {
          if (msg.direction === 'inbound' && msg.status !== 'read') {
            if (!messageIds || messageIds.includes(msg.id)) {
              return { ...msg, status: 'read' as const, read_at: new Date().toISOString() };
            }
          }
          return msg;
        })
      );

      // Atualizar no banco
      let query = supabase
        .from('whatsapp_messages')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('direction', 'inbound')
        .neq('status', 'read');

      if (messageIds && messageIds.length > 0) {
        query = query.in('id', messageIds);
      } else if (bitrixId) {
        query = query.eq('bitrix_id', bitrixId);
      } else if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      } else if (phoneNumber) {
        query = query.eq('phone_number', phoneNumber.replace(/\D/g, ''));
      }

      const { error } = await query;
      if (error) {
        console.error('Erro ao marcar mensagens como lidas:', error);
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [bitrixId, phoneNumber, conversationId]);

  return {
    messages,
    loading,
    sending,
    fetchMessages,
    sendMessage,
    sendTemplate,
    markAsRead,
  };
};

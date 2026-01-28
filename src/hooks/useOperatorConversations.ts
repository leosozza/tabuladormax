import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface OperatorStats {
  sender_name: string;
  message_count: number;
}

interface ConversationSummary {
  phone_number: string;
  contact_name: string | null;
  operator_messages: number;
  client_messages: number;
  last_message: string;
  first_message_preview: string;
}

interface ConversationMessage {
  id: string;
  phone_number: string;
  direction: 'inbound' | 'outbound';
  content: string;
  sender_name: string | null;
  created_at: string;
}

export function useOperatorsWithConversations() {
  return useQuery({
    queryKey: ['operators-with-conversations'],
    queryFn: async (): Promise<OperatorStats[]> => {
      // Buscar operadores únicos que enviaram mensagens (outbound)
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('sender_name')
        .eq('direction', 'outbound')
        .not('sender_name', 'is', null)
        .not('sender_name', 'eq', '');

      if (error) throw error;

      // Agrupar e contar mensagens por operador
      const operatorMap = new Map<string, number>();
      data?.forEach((msg) => {
        if (msg.sender_name) {
          operatorMap.set(
            msg.sender_name,
            (operatorMap.get(msg.sender_name) || 0) + 1
          );
        }
      });

      // Converter para array e ordenar por quantidade de mensagens
      return Array.from(operatorMap.entries())
        .map(([sender_name, message_count]) => ({
          sender_name,
          message_count,
        }))
        .sort((a, b) => b.message_count - a.message_count);
    },
  });
}

export function useOperatorConversations(
  operatorName: string | null,
  startDate?: Date,
  endDate?: Date
) {
  return useQuery({
    queryKey: ['operator-conversations', operatorName, startDate, endDate],
    queryFn: async (): Promise<ConversationSummary[]> => {
      if (!operatorName) return [];

      // Buscar todas as mensagens do operador
      let query = supabase
        .from('whatsapp_messages')
        .select('phone_number, direction, content, created_at, sender_name')
        .eq('sender_name', operatorName)
        .eq('direction', 'outbound');

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data: operatorMessages, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;

      // Agrupar por telefone
      const phoneNumbers = [...new Set(operatorMessages?.map((m) => m.phone_number) || [])];

      // Para cada telefone, buscar também as mensagens inbound
      const conversations: ConversationSummary[] = [];

      for (const phone of phoneNumbers) {
        // Buscar todas as mensagens da conversa
        let convQuery = supabase
          .from('whatsapp_messages')
          .select('direction, content, created_at')
          .eq('phone_number', phone);

        if (startDate) {
          convQuery = convQuery.gte('created_at', startDate.toISOString());
        }
        if (endDate) {
          convQuery = convQuery.lte('created_at', endDate.toISOString());
        }

        const { data: allMessages } = await convQuery.order('created_at', { ascending: true });

        // Buscar nome do contato
        const { data: contact } = await supabase
          .from('chatwoot_contacts')
          .select('name')
          .eq('phone_number', phone)
          .maybeSingle();

        const operatorMsgs = allMessages?.filter((m) => m.direction === 'outbound') || [];
        const clientMsgs = allMessages?.filter((m) => m.direction === 'inbound') || [];

        // Pegar primeira mensagem outbound do operador como preview
        const firstOperatorMsg = operatorMsgs[0];

        conversations.push({
          phone_number: phone,
          contact_name: contact?.name || null,
          operator_messages: operatorMsgs.length,
          client_messages: clientMsgs.length,
          last_message: allMessages?.[allMessages.length - 1]?.created_at || '',
          first_message_preview: firstOperatorMsg?.content?.substring(0, 100) || '',
        });
      }

      // Ordenar por última mensagem (mais recentes primeiro)
      return conversations.sort(
        (a, b) => new Date(b.last_message).getTime() - new Date(a.last_message).getTime()
      );
    },
    enabled: !!operatorName,
  });
}

export function useConversationMessages(phoneNumbers: string[]) {
  return useQuery({
    queryKey: ['conversation-messages', phoneNumbers],
    queryFn: async (): Promise<ConversationMessage[]> => {
      if (!phoneNumbers.length) return [];

      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('id, phone_number, direction, content, sender_name, created_at')
        .in('phone_number', phoneNumbers)
        .order('phone_number')
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((m) => ({
        id: m.id,
        phone_number: m.phone_number,
        direction: m.direction as 'inbound' | 'outbound',
        content: m.content || '',
        sender_name: m.sender_name,
        created_at: m.created_at,
      }));
    },
    enabled: phoneNumbers.length > 0,
  });
}

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { calculateWindowStatus, WindowStatus } from '@/lib/whatsappWindow';

export interface TelemarketingConversation {
  conversation_id: number;
  contact_id: number;
  lead_id: number;
  lead_name: string;
  nome_modelo: string;
  phone_number: string;
  thumbnail: string | null;
  photo_url: string | null;
  last_message_at: string | null;
  last_customer_message_at: string | null;
  bitrix_id: string;
  telemarketing: string | null;
  windowStatus: WindowStatus;
}

export function useTelemarketingConversations(bitrixTelemarketingId: number) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversations, setSelectedConversations] = useState<number[]>([]);

  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ['telemarketing-conversations', bitrixTelemarketingId],
    queryFn: async () => {
      if (!bitrixTelemarketingId) return [];

      // Buscar leads vinculados ao telemarketing com conversation_id
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select(`
          id,
          name,
          nome_modelo,
          photo_url,
          conversation_id,
          contact_id,
          celular,
          telefone_casa,
          telefone_trabalho,
          bitrix_telemarketing_id,
          telemarketing
        `)
        .eq('bitrix_telemarketing_id', bitrixTelemarketingId)
        .not('conversation_id', 'is', null)
        .order('updated_at', { ascending: false });

      if (leadsError) throw leadsError;
      if (!leads || leads.length === 0) return [];

      // Buscar dados do Chatwoot
      const conversationIds = leads
        .map(l => l.conversation_id)
        .filter((id): id is number => id !== null);

      const { data: contacts, error: contactsError } = await supabase
        .from('chatwoot_contacts')
        .select('*')
        .in('conversation_id', conversationIds);

      if (contactsError) throw contactsError;

      // Combinar dados
      const conversationsMap: Record<number, TelemarketingConversation> = {};
      
      leads.forEach(lead => {
        if (lead.conversation_id) {
          const contact = contacts?.find(c => c.conversation_id === lead.conversation_id);
          if (contact) {
            const phoneNumber = contact.phone_number || lead.celular || lead.telefone_casa || lead.telefone_trabalho || '';
            const windowStatus = calculateWindowStatus(contact.last_customer_message_at);
            
            conversationsMap[lead.conversation_id] = {
              conversation_id: lead.conversation_id,
              contact_id: contact.contact_id || 0,
              lead_id: lead.id,
              lead_name: lead.name || 'Sem nome',
              nome_modelo: lead.nome_modelo || '',
              phone_number: phoneNumber,
              thumbnail: contact.thumbnail,
              photo_url: lead.photo_url || null,
              last_message_at: contact.last_message_at || null,
              last_customer_message_at: contact.last_customer_message_at || null,
              bitrix_id: contact.bitrix_id,
              telemarketing: lead.telemarketing,
              windowStatus,
            };
          }
        }
      });

      return Object.values(conversationsMap);
    },
    enabled: !!bitrixTelemarketingId,
    refetchInterval: 30000,
  });

  // Filtrar conversas por busca
  const filteredConversations = conversations.filter(conv =>
    (conv.lead_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (conv.phone_number || '').includes(searchQuery)
  );

  const toggleSelection = (conversationId: number) => {
    setSelectedConversations(prev =>
      prev.includes(conversationId)
        ? prev.filter(id => id !== conversationId)
        : [...prev, conversationId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedConversations.length === filteredConversations.length) {
      setSelectedConversations([]);
    } else {
      setSelectedConversations(filteredConversations.map(c => c.conversation_id));
    }
  };

  const clearSelection = () => {
    setSelectedConversations([]);
  };

  // Subscribe to realtime updates
  useEffect(() => {
    if (!bitrixTelemarketingId) return;

    const channel = supabase
      .channel(`telemarketing-conversations-${bitrixTelemarketingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chatwoot_contacts',
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bitrixTelemarketingId, refetch]);

  return {
    conversations: filteredConversations,
    isLoading,
    refetch,
    searchQuery,
    setSearchQuery,
    selectedConversations,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    allSelected: selectedConversations.length === filteredConversations.length && filteredConversations.length > 0,
  };
}

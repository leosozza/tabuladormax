import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface AgentConversation {
  conversation_id: number;
  contact_id: number;
  lead_id: number;
  name: string;
  phone_number: string;
  thumbnail: string | null;
  last_message_at: string | null;
  bitrix_id: string;
  commercial_project_id: string | null;
}

export function useAgentConversations() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversations, setSelectedConversations] = useState<number[]>([]);

  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ['agent-conversations'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar leads do agente
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select(`
          id,
          name,
          conversation_id,
          contact_id,
          commercial_project_id,
          celular,
          telefone_casa,
          telefone_trabalho
        `)
        .eq('responsible_user_id', user.id)
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
      const conversationsMap: Record<number, AgentConversation> = {};
      
      leads.forEach(lead => {
        if (lead.conversation_id) {
          const contact = contacts?.find(c => c.conversation_id === lead.conversation_id);
          if (contact) {
            // Usar phone do contact, ou fallback para celular/telefones do lead
            const phoneNumber = contact.phone_number || lead.celular || lead.telefone_casa || lead.telefone_trabalho || '';
            
            conversationsMap[lead.conversation_id] = {
              conversation_id: lead.conversation_id,
              contact_id: contact.contact_id || 0,
              lead_id: lead.id,
              name: contact.name || lead.name || 'Sem nome',
              phone_number: phoneNumber,
              thumbnail: contact.thumbnail,
              last_message_at: contact.last_message_at || null,
              bitrix_id: contact.bitrix_id,
              commercial_project_id: lead.commercial_project_id,
            };
          }
        }
      });

      return Object.values(conversationsMap);
    },
    refetchInterval: 30000, // Atualizar a cada 30s
  });

  // Filtrar conversas por busca
  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.phone_number.includes(searchQuery)
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
    const channel = supabase
      .channel('agent-conversations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `responsible_user_id=eq.${supabase.auth.getUser().then(u => u.data.user?.id)}`,
        },
        () => {
          refetch();
        }
      )
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
  }, [refetch]);

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

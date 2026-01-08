import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { calculateWindowStatus, WindowStatus } from '@/lib/whatsappWindow';

export interface TelemarketingConversation {
  lead_id: number;
  bitrix_id: string;
  lead_name: string;
  nome_modelo: string;
  phone_number: string;
  photo_url: string | null;
  last_message_at: string | null;
  last_customer_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  windowStatus: WindowStatus;
  telemarketing_name?: string;
  conversation_id?: number;
}

interface UseTelemarketingConversationsOptions {
  bitrixTelemarketingId: number;
  cargo?: string;
  commercialProjectId?: string;
  teamOperatorIds?: number[];
}

import { isSupervisorCargo } from '@/components/portal-telemarketing/TelemarketingAccessKeyForm';

export function useTelemarketingConversations(
  bitrixTelemarketingIdOrOptions: number | UseTelemarketingConversationsOptions
) {
  // Suporta chamada legada (apenas number) ou nova (objeto)
  const options: UseTelemarketingConversationsOptions = 
    typeof bitrixTelemarketingIdOrOptions === 'number'
      ? { bitrixTelemarketingId: bitrixTelemarketingIdOrOptions }
      : bitrixTelemarketingIdOrOptions;

  const { bitrixTelemarketingId, cargo, commercialProjectId, teamOperatorIds } = options;
  const isSupervisor = cargo ? isSupervisorCargo(cargo) : false;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversations, setSelectedConversations] = useState<number[]>([]);

  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ['telemarketing-conversations', bitrixTelemarketingId, cargo, teamOperatorIds],
    queryFn: async () => {
      if (!bitrixTelemarketingId) return [];

      // Supervisor sem equipe: retornar vazio
      if (isSupervisor && teamOperatorIds !== undefined && teamOperatorIds.length === 0) {
        return [];
      }

      // Usar a nova RPC que faz tudo em uma query (bypass RLS)
      const { data, error } = await supabase.rpc('get_telemarketing_conversations', {
        p_operator_bitrix_id: bitrixTelemarketingId,
        p_team_operator_ids: isSupervisor && teamOperatorIds?.length ? teamOperatorIds : null,
        p_search: null,
        p_limit: 500
      });

      if (error) {
        console.error('Erro ao buscar conversas:', error);
        throw error;
      }

      if (!data) return [];

      // Mapear para o formato esperado
      return data.map((row: any): TelemarketingConversation => ({
        lead_id: row.lead_id,
        bitrix_id: row.bitrix_id,
        lead_name: row.lead_name || 'Sem nome',
        nome_modelo: row.lead_name || '',
        phone_number: row.phone_number || '',
        photo_url: row.photo_url || null,
        last_message_at: row.last_message_at,
        last_customer_message_at: row.window_open ? row.last_message_at : null,
        last_message_preview: row.last_message_preview,
        unread_count: row.unread_count || 0,
        windowStatus: calculateWindowStatus(row.window_open ? row.last_message_at : null),
        telemarketing_name: row.telemarketing_name || undefined,
        conversation_id: undefined,
      }));
    },
    enabled: !!bitrixTelemarketingId,
    refetchInterval: 30000,
  });

  // Filtrar conversas por busca
  const filteredConversations = conversations.filter(conv =>
    (conv.lead_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (conv.phone_number || '').includes(searchQuery) ||
    (conv.telemarketing_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelection = (leadId: number) => {
    setSelectedConversations(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedConversations.length === filteredConversations.length) {
      setSelectedConversations([]);
    } else {
      setSelectedConversations(filteredConversations.map(c => c.lead_id));
    }
  };

  const clearSelection = () => {
    setSelectedConversations([]);
  };

  // Subscribe to realtime updates
  useEffect(() => {
    if (!bitrixTelemarketingId) return;

    const channel = supabase
      .channel(`telemarketing-whatsapp-${bitrixTelemarketingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages',
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
    isSupervisor,
  };
}

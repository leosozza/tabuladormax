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

const SUPERVISOR_CARGO = '10620';

export function useTelemarketingConversations(
  bitrixTelemarketingIdOrOptions: number | UseTelemarketingConversationsOptions
) {
  // Suporta chamada legada (apenas number) ou nova (objeto)
  const options: UseTelemarketingConversationsOptions = 
    typeof bitrixTelemarketingIdOrOptions === 'number'
      ? { bitrixTelemarketingId: bitrixTelemarketingIdOrOptions }
      : bitrixTelemarketingIdOrOptions;

  const { bitrixTelemarketingId, cargo, commercialProjectId, teamOperatorIds } = options;
  const isSupervisor = cargo === SUPERVISOR_CARGO;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversations, setSelectedConversations] = useState<number[]>([]);

  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ['telemarketing-conversations', bitrixTelemarketingId, cargo, commercialProjectId, teamOperatorIds],
    queryFn: async () => {
      if (!bitrixTelemarketingId) return [];

      let leads: any[] = [];

      if (isSupervisor && teamOperatorIds !== undefined) {
        // SUPERVISOR com equipe definida
        if (teamOperatorIds.length === 0) {
          // Supervisor sem equipe: retornar vazio
          return [];
        }
        
        // Buscar leads vinculados aos membros da equipe
        const { data: teamLeads, error: teamError } = await supabase
          .from('leads')
          .select(`
            id,
            name,
            nome_modelo,
            photo_url,
            celular,
            telefone_casa,
            telefone_trabalho,
            bitrix_telemarketing_id,
            telemarketing,
            conversation_id
          `)
          .in('bitrix_telemarketing_id', teamOperatorIds)
          .order('updated_at', { ascending: false })
          .limit(500);

        if (teamError) throw teamError;
        leads = teamLeads || [];
      } else {
        // AGENTE: Buscar apenas leads vinculados ao telemarketing específico
        const { data: agentLeads, error: leadsError } = await supabase
          .from('leads')
          .select(`
            id,
            name,
            nome_modelo,
            photo_url,
            celular,
            telefone_casa,
            telefone_trabalho,
            bitrix_telemarketing_id,
            telemarketing,
            conversation_id
          `)
          .eq('bitrix_telemarketing_id', bitrixTelemarketingId)
          .order('updated_at', { ascending: false });

        if (leadsError) throw leadsError;
        leads = agentLeads || [];
      }

      if (leads.length === 0) return [];

      // Coletar todos os telefones dos leads (normalizados)
      const phoneToLeadMap: Record<string, typeof leads[0]> = {};
      const leadIdsWithoutPhone: number[] = [];
      
      leads.forEach(lead => {
        const phones = [lead.celular, lead.telefone_casa, lead.telefone_trabalho].filter(Boolean);
        if (phones.length === 0) {
          // Lead sem telefone cadastrado - marcar para buscar nas mensagens
          leadIdsWithoutPhone.push(lead.id);
        }
        phones.forEach(phone => {
          if (phone) {
            const normalizedPhone = phone.replace(/\D/g, '');
            if (normalizedPhone.length >= 10) {
              phoneToLeadMap[normalizedPhone] = lead;
            }
          }
        });
      });

      // Para leads sem telefone, buscar telefones das mensagens enviadas via automação
      const leadIdToPhoneFromMessages: Record<number, string> = {};
      
      if (leadIdsWithoutPhone.length > 0) {
        const { data: phonesFromMessages } = await supabase
          .from('whatsapp_messages')
          .select('bitrix_id, phone_number')
          .in('bitrix_id', leadIdsWithoutPhone.map(String))
          .order('created_at', { ascending: false });

        if (phonesFromMessages) {
          phonesFromMessages.forEach(msg => {
            if (msg.bitrix_id && msg.phone_number) {
              const leadId = parseInt(msg.bitrix_id, 10);
              // Usar o telefone mais recente (primeira ocorrência)
              if (!leadIdToPhoneFromMessages[leadId]) {
                const normalizedPhone = msg.phone_number.replace(/\D/g, '');
                if (normalizedPhone.length >= 10) {
                  leadIdToPhoneFromMessages[leadId] = normalizedPhone;
                  // Adicionar ao mapa de telefone -> lead
                  const lead = leads.find(l => l.id === leadId);
                  if (lead) {
                    phoneToLeadMap[normalizedPhone] = lead;
                  }
                }
              }
            }
          });
        }
      }

      const phoneNumbers = Object.keys(phoneToLeadMap);
      if (phoneNumbers.length === 0) return [];

      // Buscar estatísticas de mensagens via RPC (bypass RLS)
      // Determinar qual operador usar para a busca
      const operatorIdsForMessages = isSupervisor && teamOperatorIds?.length 
        ? teamOperatorIds 
        : [bitrixTelemarketingId];

      // Agrupar mensagens por telefone e calcular estatísticas
      const messageStats: Record<string, {
        last_message_at: string | null;
        last_customer_message_at: string | null;
        last_message_preview: string | null;
        unread_count: number;
      }> = {};

      // Para cada operador, buscar mensagens usando a RPC
      for (const operatorId of operatorIdsForMessages) {
        const operatorPhones = phoneNumbers.filter(phone => {
          const lead = phoneToLeadMap[phone];
          return lead?.bitrix_telemarketing_id === operatorId;
        });

        if (operatorPhones.length === 0) continue;

        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_operator_whatsapp_messages', {
            p_operator_bitrix_id: operatorId,
            p_phone_numbers: operatorPhones
          });

        if (rpcError) {
          console.error('Erro ao buscar mensagens via RPC:', rpcError);
          continue;
        }

        if (rpcData) {
          rpcData.forEach((row: any) => {
            messageStats[row.phone_number] = {
              last_message_at: row.last_message_at,
              last_customer_message_at: row.last_message_direction === 'inbound' ? row.last_message_at : null,
              last_message_preview: row.last_message_content?.substring(0, 50) || null,
              unread_count: 0, // RPC simplificada não retorna unread, mas isso pode ser expandido
            };
          });
        }
      }

      // Combinar dados de leads com estatísticas de mensagens
      const conversationsMap: Record<number, TelemarketingConversation> = {};
      
      leads.forEach(lead => {
        const leadPhones = [lead.celular, lead.telefone_casa, lead.telefone_trabalho]
          .filter(Boolean)
          .map(p => p?.replace(/\D/g, '') || '');
        
        // Fallback: telefone obtido das mensagens de automação
        const phoneFromMessages = leadIdToPhoneFromMessages[lead.id];
        
        const phoneWithMessages = leadPhones.find(p => messageStats[p]);
        const primaryPhone = phoneWithMessages || leadPhones[0] || phoneFromMessages || '';
        
        if (primaryPhone) {
          const stats = messageStats[primaryPhone] || {
            last_message_at: null,
            last_customer_message_at: null,
            last_message_preview: null,
            unread_count: 0,
          };

          const windowStatus = calculateWindowStatus(stats.last_customer_message_at);
          
          conversationsMap[lead.id] = {
            lead_id: lead.id,
            bitrix_id: String(lead.id),
            lead_name: lead.name || 'Sem nome',
            nome_modelo: lead.nome_modelo || '',
            phone_number: primaryPhone,
            photo_url: lead.photo_url || null,
            last_message_at: stats.last_message_at,
            last_customer_message_at: stats.last_customer_message_at,
            last_message_preview: stats.last_message_preview,
            unread_count: stats.unread_count,
            windowStatus,
            telemarketing_name: lead.telemarketing || undefined,
            conversation_id: lead.conversation_id || undefined,
          };
        }
      });

      // Ordenar por última mensagem (mais recentes primeiro)
      return Object.values(conversationsMap).sort((a, b) => {
        if (!a.last_message_at && !b.last_message_at) return 0;
        if (!a.last_message_at) return 1;
        if (!b.last_message_at) return -1;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });
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

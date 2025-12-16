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
}

interface UseTelemarketingConversationsOptions {
  bitrixTelemarketingId: number;
  cargo?: string;
  commercialProjectId?: string;
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

  const { bitrixTelemarketingId, cargo, commercialProjectId } = options;
  const isSupervisor = cargo === SUPERVISOR_CARGO;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversations, setSelectedConversations] = useState<number[]>([]);

  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ['telemarketing-conversations', bitrixTelemarketingId, cargo, commercialProjectId],
    queryFn: async () => {
      if (!bitrixTelemarketingId) return [];

      let leads: any[] = [];

      if (isSupervisor && commercialProjectId) {
        // SUPERVISOR: Buscar todos os leads do projeto comercial
        const { data: projectLeads, error: projectError } = await supabase
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
            telemarketing
          `)
          .eq('commercial_project_id', commercialProjectId)
          .not('bitrix_telemarketing_id', 'is', null)
          .order('updated_at', { ascending: false })
          .limit(500);

        if (projectError) throw projectError;
        leads = projectLeads || [];
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
            telemarketing
          `)
          .eq('bitrix_telemarketing_id', bitrixTelemarketingId)
          .order('updated_at', { ascending: false });

        if (leadsError) throw leadsError;
        leads = agentLeads || [];
      }

      if (leads.length === 0) return [];

      // Coletar todos os telefones dos leads (normalizados)
      const phoneToLeadMap: Record<string, typeof leads[0]> = {};
      leads.forEach(lead => {
        const phones = [lead.celular, lead.telefone_casa, lead.telefone_trabalho].filter(Boolean);
        phones.forEach(phone => {
          if (phone) {
            const normalizedPhone = phone.replace(/\D/g, '');
            if (normalizedPhone.length >= 10) {
              phoneToLeadMap[normalizedPhone] = lead;
            }
          }
        });
      });

      const phoneNumbers = Object.keys(phoneToLeadMap);
      if (phoneNumbers.length === 0) return [];

      // Buscar estatísticas de mensagens para cada telefone
      const { data: messagesData, error: messagesError } = await supabase
        .from('whatsapp_messages')
        .select('phone_number, direction, content, created_at, status')
        .in('phone_number', phoneNumbers)
        .order('created_at', { ascending: false });

      if (messagesError) {
        console.error('Erro ao buscar mensagens:', messagesError);
      }

      // Agrupar mensagens por telefone e calcular estatísticas
      const messageStats: Record<string, {
        last_message_at: string | null;
        last_customer_message_at: string | null;
        last_message_preview: string | null;
        unread_count: number;
      }> = {};

      if (messagesData) {
        const groupedByPhone: Record<string, typeof messagesData> = {};
        messagesData.forEach(msg => {
          if (!groupedByPhone[msg.phone_number]) {
            groupedByPhone[msg.phone_number] = [];
          }
          groupedByPhone[msg.phone_number].push(msg);
        });

        Object.entries(groupedByPhone).forEach(([phone, messages]) => {
          const lastMessage = messages[0];
          const lastCustomerMessage = messages.find(m => m.direction === 'inbound');
          const unreadCount = messages.filter(m => 
            m.direction === 'inbound' && m.status !== 'read'
          ).length;

          messageStats[phone] = {
            last_message_at: lastMessage?.created_at || null,
            last_customer_message_at: lastCustomerMessage?.created_at || null,
            last_message_preview: lastMessage?.content?.substring(0, 50) || null,
            unread_count: unreadCount,
          };
        });
      }

      // Combinar dados de leads com estatísticas de mensagens
      const conversationsMap: Record<number, TelemarketingConversation> = {};
      
      leads.forEach(lead => {
        const leadPhones = [lead.celular, lead.telefone_casa, lead.telefone_trabalho]
          .filter(Boolean)
          .map(p => p?.replace(/\D/g, '') || '');
        
        const phoneWithMessages = leadPhones.find(p => messageStats[p]);
        const primaryPhone = phoneWithMessages || leadPhones[0] || '';
        
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

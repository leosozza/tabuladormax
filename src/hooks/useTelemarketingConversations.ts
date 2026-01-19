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
  data_agendamento?: string | null;
  isLoadingStats?: boolean;
}

interface UseTelemarketingConversationsOptions {
  bitrixTelemarketingId: number;
  cargo?: string;
  commercialProjectId?: string;
  teamOperatorIds?: number[];
  agendamentoFilter?: string; // 'all' | 'today' | 'yesterday' | '3days' | '7days'
}

import { isSupervisorCargo } from '@/components/portal-telemarketing/TelemarketingAccessKeyForm';

// Helper para extrair telefones de forma robusta (JSON ou string)
function extractPhones(lead: any): string[] {
  const phones: string[] = [];
  
  const extractFromField = (field: any): void => {
    if (!field) return;
    
    // Se for string que parece JSON, tentar parsear
    if (typeof field === 'string') {
      const trimmed = field.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            parsed.forEach(item => {
              if (item && item.VALUE) {
                const normalized = String(item.VALUE).replace(/\D/g, '');
                if (normalized.length >= 10) phones.push(normalized);
              }
            });
          } else if (parsed && parsed.VALUE) {
            const normalized = String(parsed.VALUE).replace(/\D/g, '');
            if (normalized.length >= 10) phones.push(normalized);
          }
          return;
        } catch {
          // Não é JSON válido, tratar como string normal
        }
      }
      // String normal
      const normalized = trimmed.replace(/\D/g, '');
      if (normalized.length >= 10) phones.push(normalized);
    }
  };
  
  extractFromField(lead.celular);
  extractFromField(lead.telefone_casa);
  extractFromField(lead.telefone_trabalho);
  
  return [...new Set(phones)]; // Remover duplicados
}

// Calcular range de datas no fuso de São Paulo para consistência com dashboard
function getAgendamentoDateRange(agendamentoFilter: string | undefined): { start: string; end: string } | null {
  if (!agendamentoFilter || agendamentoFilter === 'all') return null;
  
  // Usar timezone de São Paulo para consistência com dashboard
  const nowSP = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const todayStart = new Date(nowSP.getFullYear(), nowSP.getMonth(), nowSP.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  
  switch (agendamentoFilter) {
    case 'today':
      return { start: todayStart.toISOString(), end: todayEnd.toISOString() };
    case 'yesterday': {
      const yesterday = new Date(todayStart.getTime() - 86400000);
      return { start: yesterday.toISOString(), end: todayStart.toISOString() };
    }
    case '3days': {
      const threeDaysAgo = new Date(todayStart.getTime() - 3 * 86400000);
      return { start: threeDaysAgo.toISOString(), end: todayEnd.toISOString() };
    }
    case '7days': {
      const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 86400000);
      return { start: sevenDaysAgo.toISOString(), end: todayEnd.toISOString() };
    }
    default:
      return null;
  }
}

export function useTelemarketingConversations(
  bitrixTelemarketingIdOrOptions: number | UseTelemarketingConversationsOptions
) {
  // Suporta chamada legada (apenas number) ou nova (objeto)
  const options: UseTelemarketingConversationsOptions = 
    typeof bitrixTelemarketingIdOrOptions === 'number'
      ? { bitrixTelemarketingId: bitrixTelemarketingIdOrOptions }
      : bitrixTelemarketingIdOrOptions;

  const { bitrixTelemarketingId, cargo, commercialProjectId, teamOperatorIds, agendamentoFilter } = options;
  const isSupervisor = cargo ? isSupervisorCargo(cargo) : false;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversations, setSelectedConversations] = useState<number[]>([]);

  // FASE 1: Buscar leads (com timeout e retry otimizado)
  const { data: leadsData, isLoading: isLoadingLeads, refetch, isError: isLeadsError } = useQuery({
    queryKey: ['telemarketing-leads', bitrixTelemarketingId, cargo, commercialProjectId, teamOperatorIds, agendamentoFilter],
    queryFn: async ({ signal }) => {
      if (!bitrixTelemarketingId) return { leads: [], phoneToLeadMap: {}, leadIdToPhoneFromMessages: {} };

      const dateRange = getAgendamentoDateRange(agendamentoFilter);
      let leads: any[] = [];

      // Timeout de 15s para evitar travamentos
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout ao buscar leads')), 15000);
      });

      const fetchLeads = async () => {
        if (isSupervisor && teamOperatorIds !== undefined) {
          if (teamOperatorIds.length === 0) {
            return { leads: [], phoneToLeadMap: {}, leadIdToPhoneFromMessages: {} };
          }
          
          let query = supabase
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
              conversation_id,
              data_agendamento,
              data_criacao_agendamento
            `)
            .in('bitrix_telemarketing_id', teamOperatorIds)
            .order('updated_at', { ascending: false })
            .limit(300); // Reduzido de 500 para 300 para melhor performance

          if (dateRange) {
            query = query
              .not('data_criacao_agendamento', 'is', null)
              .gte('data_criacao_agendamento', dateRange.start)
              .lt('data_criacao_agendamento', dateRange.end);
          }

          const { data: teamLeads, error: teamError } = await query;
          if (teamError) throw teamError;
          leads = teamLeads || [];
        } else {
          let query = supabase
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
              conversation_id,
              data_agendamento,
              data_criacao_agendamento
            `)
            .eq('bitrix_telemarketing_id', bitrixTelemarketingId)
            .order('updated_at', { ascending: false })
            .limit(500);

          if (dateRange) {
            query = query
              .not('data_criacao_agendamento', 'is', null)
              .gte('data_criacao_agendamento', dateRange.start)
              .lt('data_criacao_agendamento', dateRange.end);
          }

          const { data: agentLeads, error: leadsError } = await query;
          if (leadsError) throw leadsError;
          leads = agentLeads || [];
        }

        if (leads.length === 0) {
          return { leads: [], phoneToLeadMap: {}, leadIdToPhoneFromMessages: {} };
        }

        // Coletar telefones usando extrator robusto
        const phoneToLeadMap: Record<string, typeof leads[0]> = {};
        const leadIdsWithoutPhone: number[] = [];
        
        leads.forEach(lead => {
          const phones = extractPhones(lead);
          if (phones.length === 0) {
            leadIdsWithoutPhone.push(lead.id);
          }
          phones.forEach(phone => {
            phoneToLeadMap[phone] = lead;
          });
        });

        // Buscar telefones das mensagens para leads sem telefone (com timeout separado)
        const leadIdToPhoneFromMessages: Record<number, string> = {};
        
        if (leadIdsWithoutPhone.length > 0 && leadIdsWithoutPhone.length <= 100) {
          try {
            const { data: phonesFromMessages } = await supabase
              .from('whatsapp_messages')
              .select('bitrix_id, phone_number')
              .in('bitrix_id', leadIdsWithoutPhone.slice(0, 50).map(String))
              .order('created_at', { ascending: false })
              .limit(100);

            if (phonesFromMessages) {
              phonesFromMessages.forEach(msg => {
                if (msg.bitrix_id && msg.phone_number) {
                  const leadId = parseInt(msg.bitrix_id, 10);
                  if (!leadIdToPhoneFromMessages[leadId]) {
                    const normalizedPhone = msg.phone_number.replace(/\D/g, '');
                    if (normalizedPhone.length >= 10) {
                      leadIdToPhoneFromMessages[leadId] = normalizedPhone;
                      const lead = leads.find(l => l.id === leadId);
                      if (lead) {
                        phoneToLeadMap[normalizedPhone] = lead;
                      }
                    }
                  }
                }
              });
            }
          } catch (err) {
            console.warn('Falha ao buscar telefones de mensagens, continuando sem eles:', err);
          }
        }

        return { leads, phoneToLeadMap, leadIdToPhoneFromMessages };
      };

      // Race entre fetch e timeout
      return Promise.race([fetchLeads(), timeoutPromise]);
    },
    enabled: !!bitrixTelemarketingId,
    staleTime: 60000, // Cache por 60s ao invés de 30s
    gcTime: 120000, // Manter em cache por 2 minutos
    retry: 2, // Retry 2 vezes em caso de falha
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Backoff exponencial
  });

  // FASE 2: Buscar estatísticas de mensagens usando RPC (separado, pode falhar sem quebrar a lista)
  const phoneNumbers = Object.keys(leadsData?.phoneToLeadMap || {});
  
  const { data: messageStats, isLoading: isLoadingStats, isError: isStatsError } = useQuery({
    queryKey: ['telemarketing-message-stats', phoneNumbers.slice(0, 200)], // Limitar a 200 telefones
    queryFn: async () => {
      if (phoneNumbers.length === 0) return {};

      // Timeout de 10s para estatísticas (não crítico)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        // Limitar a 200 telefones para evitar queries muito grandes
        const limitedPhones = phoneNumbers.slice(0, 200);
        
        const { data, error } = await supabase.rpc('get_whatsapp_message_stats', {
          p_phone_numbers: limitedPhones
        });

        clearTimeout(timeoutId);

        if (error) {
          console.error('Erro ao buscar stats via RPC:', error);
          return {};
        }

        const stats: Record<string, {
          last_message_at: string | null;
          last_customer_message_at: string | null;
          last_message_preview: string | null;
          unread_count: number;
        }> = {};

        (data || []).forEach((row: any) => {
          stats[row.phone_number] = {
            last_message_at: row.last_message_at,
            last_customer_message_at: row.last_customer_message_at,
            last_message_preview: row.last_message_content?.substring(0, 50) || null,
            unread_count: Number(row.unread_count) || 0,
          };
        });

        return stats;
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === 'AbortError') {
          console.warn('Timeout ao buscar estatísticas de mensagens');
        } else {
          console.error('Erro ao buscar estatísticas de mensagens:', err);
        }
        return {};
      }
    },
    enabled: phoneNumbers.length > 0,
    staleTime: 60000, // Cache por 60s
    gcTime: 120000,
    retry: 1,
    retryDelay: 2000,
  });

  // Combinar leads com estatísticas
  const conversations: TelemarketingConversation[] = (() => {
    if (!leadsData?.leads) return [];
    
    const { leads, phoneToLeadMap, leadIdToPhoneFromMessages } = leadsData;
    const statsMap = messageStats || {};
    
    const conversationsMap: Record<number, TelemarketingConversation> = {};
    
    leads.forEach(lead => {
      const phones = extractPhones(lead);
      const phoneFromMessages = leadIdToPhoneFromMessages[lead.id];
      
      const phoneWithMessages = phones.find(p => statsMap[p]);
      const primaryPhone = phoneWithMessages || phones[0] || phoneFromMessages || '';
      
      if (primaryPhone) {
        const stats = statsMap[primaryPhone] || {
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
          data_agendamento: lead.data_agendamento || null,
          isLoadingStats: isLoadingStats,
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
  })();

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
    isLoading: isLoadingLeads,
    isLoadingStats,
    refetch,
    searchQuery,
    setSearchQuery,
    selectedConversations,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    allSelected: selectedConversations.length === filteredConversations.length && filteredConversations.length > 0,
    isSupervisor,
    totalLeads: leadsData?.leads?.length || 0,
  };
}

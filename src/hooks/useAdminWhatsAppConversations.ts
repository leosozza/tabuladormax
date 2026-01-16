import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';

export interface AdminConversation {
  phone_number: string | null;
  bitrix_id: string | null;
  lead_name: string | null;
  lead_id: number | null;
  last_message_at: string;
  last_message_preview: string | null;
  last_message_direction: string | null;
  last_customer_message_at: string | null;
  unread_count: number;
  total_messages: number;
  is_window_open: boolean;
  last_operator_name: string | null;
  last_operator_photo_url: string | null;
  lead_etapa: string | null;
  response_status: 'waiting' | 'never' | 'replied' | null;
}

export type WindowFilter = 'all' | 'open' | 'closed';
export type ResponseFilter = 'all' | 'waiting' | 'never' | 'replied';

interface UseAdminWhatsAppConversationsParams {
  search?: string;
  windowFilter?: WindowFilter;
  responseFilter?: ResponseFilter;
  etapaFilter?: string | null;
  limit?: number;
}

export const useAdminWhatsAppConversations = ({
  search = '',
  windowFilter = 'all',
  responseFilter = 'all',
  etapaFilter = null,
  limit = 50
}: UseAdminWhatsAppConversationsParams = {}) => {
  const queryClient = useQueryClient();

  // Use infinite query for proper pagination with accumulation
  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['admin-whatsapp-conversations', search, windowFilter, responseFilter, etapaFilter, limit],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase.rpc('get_admin_whatsapp_conversations', {
        p_limit: limit,
        p_offset: pageParam,
        p_search: search || null,
        p_window_filter: windowFilter,
        p_response_filter: responseFilter,
        p_etapa_filter: etapaFilter || null
      });

      if (error) throw error;

      // Calculate window status for each conversation
      const now = new Date();
      const windowHours = 24;

      const conversations = (data || []).map((conv: any): AdminConversation => {
        const lastCustomerMessage = conv.last_customer_message_at 
          ? new Date(conv.last_customer_message_at) 
          : null;
        
        const isWindowOpen = lastCustomerMessage 
          ? (now.getTime() - lastCustomerMessage.getTime()) < (windowHours * 60 * 60 * 1000)
          : false;

        return {
          phone_number: conv.phone_number,
          bitrix_id: conv.bitrix_id,
          lead_name: conv.lead_name,
          lead_id: conv.lead_id ? Number(conv.lead_id) : null,
          last_message_at: conv.last_message_at,
          last_message_preview: conv.last_message_preview,
          last_message_direction: conv.last_message_direction,
          last_customer_message_at: conv.last_customer_message_at,
          unread_count: Number(conv.unread_count) || 0,
          total_messages: Number(conv.total_messages) || 0,
          is_window_open: isWindowOpen,
          last_operator_name: conv.last_operator_name || null,
          last_operator_photo_url: conv.last_operator_photo_url || null,
          lead_etapa: conv.lead_etapa || null,
          response_status: conv.response_status as 'waiting' | 'never' | 'replied' | null
        };
      });

      return {
        conversations,
        nextOffset: pageParam + limit,
        hasMore: conversations.length === limit
      };
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextOffset : undefined,
    initialPageParam: 0,
    staleTime: 30000,
  });

  // Flatten all pages into a single array
  const conversations = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.conversations);
  }, [data]);

  // Get total count for display
  const { data: totalCount } = useQuery({
    queryKey: ['admin-whatsapp-conversations-count', search, windowFilter, responseFilter, etapaFilter],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('count_admin_whatsapp_conversations', {
        p_search: search || null,
        p_window_filter: windowFilter,
        p_response_filter: responseFilter,
        p_etapa_filter: etapaFilter || null
      });

      if (error) throw error;
      return Number(data) || 0;
    },
    staleTime: 60000,
  });

  // Get stats
  const { data: stats } = useQuery({
    queryKey: ['admin-whatsapp-stats'],
    queryFn: async () => {
      // Get total conversations
      const { data: totalData } = await supabase.rpc('count_admin_whatsapp_conversations', {
        p_search: null,
        p_window_filter: 'all'
      });

      // Get open window count
      const { data: openData } = await supabase.rpc('count_admin_whatsapp_conversations', {
        p_search: null,
        p_window_filter: 'open'
      });

      // Get unread count
      const { count: unreadCount } = await supabase
        .from('whatsapp_messages')
        .select('*', { count: 'exact', head: true })
        .is('read_at', null)
        .eq('direction', 'inbound');

      return {
        total: Number(totalData) || 0,
        openWindows: Number(openData) || 0,
        unread: unreadCount || 0
      };
    },
    staleTime: 60000,
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-whatsapp-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages'
        },
        () => {
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-conversations'] });
          queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-conversations-count'] });
          queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-stats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    conversations,
    isLoading,
    isLoadingMore: isFetchingNextPage,
    error,
    refetch,
    stats: stats || { total: 0, openWindows: 0, unread: 0 },
    totalCount: totalCount || 0,
    loadMore,
    hasMore: hasNextPage || false
  };
};

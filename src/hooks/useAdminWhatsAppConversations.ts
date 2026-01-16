import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
}

export type WindowFilter = 'all' | 'open' | 'closed';

interface UseAdminWhatsAppConversationsParams {
  search?: string;
  windowFilter?: WindowFilter;
  limit?: number;
}

export const useAdminWhatsAppConversations = ({
  search = '',
  windowFilter = 'all',
  limit = 50
}: UseAdminWhatsAppConversationsParams = {}) => {
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0);
  }, [search, windowFilter]);

  const { data: conversations, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-whatsapp-conversations', search, windowFilter, limit, offset],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_whatsapp_conversations', {
        p_limit: limit,
        p_offset: offset,
        p_search: search || null,
        p_window_filter: windowFilter
      });

      if (error) throw error;

      // Calculate window status for each conversation
      const now = new Date();
      const windowHours = 24;

      return (data || []).map((conv: any): AdminConversation => {
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
          is_window_open: isWindowOpen
        };
      });
    },
    staleTime: 30000, // 30 seconds
  });

  // Get total count for pagination
  const { data: totalCount } = useQuery({
    queryKey: ['admin-whatsapp-conversations-count', search, windowFilter],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('count_admin_whatsapp_conversations', {
        p_search: search || null,
        p_window_filter: windowFilter
      });

      if (error) throw error;
      return Number(data) || 0;
    },
    staleTime: 60000, // 1 minute
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
    if (conversations && conversations.length >= limit) {
      setOffset(prev => prev + limit);
    }
  }, [conversations, limit]);

  const hasMore = totalCount ? offset + limit < totalCount : false;

  return {
    conversations: conversations || [],
    isLoading,
    error,
    refetch,
    stats: stats || { total: 0, openWindows: 0, unread: 0 },
    totalCount: totalCount || 0,
    loadMore,
    hasMore
  };
};

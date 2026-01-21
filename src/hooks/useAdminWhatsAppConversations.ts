import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  deal_stage_id: string | null;
  deal_status: 'won' | 'lost' | 'open' | null;
  deal_category_id: string | null;
}

export type WindowFilter = 'all' | 'open' | 'closed';
export type ResponseFilter = 'all' | 'waiting' | 'never' | 'replied';
export type DealStatusFilter = 'all' | 'won' | 'lost' | 'open' | 'no_deal';

interface UseAdminWhatsAppConversationsParams {
  search?: string;
  windowFilter?: WindowFilter;
  responseFilter?: ResponseFilter;
  etapaFilter?: string | null;
  dealStatusFilter?: DealStatusFilter;
  limit?: number;
}

// Throttle interval for realtime updates (5 seconds)
const REALTIME_THROTTLE_MS = 5000;

export const useAdminWhatsAppConversations = ({
  search = '',
  windowFilter = 'all',
  responseFilter = 'all',
  etapaFilter = null,
  dealStatusFilter = 'all',
  limit = 30 // Reduced default for faster initial load
}: UseAdminWhatsAppConversationsParams = {}) => {
  const queryClient = useQueryClient();
  const lastInvalidateRef = useRef<number>(0);
  const pendingInvalidateRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['admin-whatsapp-conversations', search, windowFilter, responseFilter, etapaFilter, dealStatusFilter, limit],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase.rpc('get_admin_whatsapp_conversations', {
        p_limit: limit,
        p_offset: pageParam,
        p_search: search || null,
        p_window_filter: windowFilter,
        p_response_filter: responseFilter,
        p_etapa_filter: etapaFilter || null,
        p_deal_status_filter: dealStatusFilter
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
          response_status: conv.response_status as 'waiting' | 'never' | 'replied' | null,
          deal_stage_id: conv.deal_stage_id || null,
          deal_status: conv.deal_status as 'won' | 'lost' | 'open' | null,
          deal_category_id: conv.deal_category_id || null
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
    staleTime: 60000,
    gcTime: 300000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: false, // Prevent refetch on tab switch
  });

  // Flatten all pages into a single array
  const conversations = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.conversations);
  }, [data]);

  // Use optimized stats RPC instead of multiple calls
  const { data: stats } = useQuery({
    queryKey: ['admin-whatsapp-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_whatsapp_stats');
      
      if (error) {
        // Fallback to basic count if new RPC not available
        return { total: 0, openWindows: 0, unread: 0 };
      }

      const statsArray = data as Array<{
        total_conversations: number;
        open_windows: number;
        total_unread: number;
        last_refresh: string;
      }> | null;
      
      const statsData = statsArray?.[0];
      return {
        total: Number(statsData?.total_conversations) || 0,
        openWindows: Number(statsData?.open_windows) || 0,
        unread: Number(statsData?.total_unread) || 0
      };
    },
    enabled: conversations.length > 0,
    staleTime: 120000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  // Get total count for display (filtered) - lazy load
  const { data: totalCount } = useQuery({
    queryKey: ['admin-whatsapp-conversations-count', search, windowFilter, responseFilter, etapaFilter, dealStatusFilter],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('count_admin_whatsapp_conversations', {
        p_search: search || null,
        p_window_filter: windowFilter,
        p_response_filter: responseFilter,
        p_etapa_filter: etapaFilter || null,
        p_deal_status_filter: dealStatusFilter
      });

      if (error) throw error;
      return Number(data) || 0;
    },
    enabled: conversations.length > 0,
    staleTime: 120000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  // Throttled invalidation function
  const throttledInvalidate = useCallback(() => {
    const now = Date.now();
    const timeSinceLastInvalidate = now - lastInvalidateRef.current;

    // If enough time has passed, invalidate immediately
    if (timeSinceLastInvalidate >= REALTIME_THROTTLE_MS) {
      lastInvalidateRef.current = now;
      queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-stats'] });
      return;
    }

    // Otherwise, schedule a delayed invalidation (if not already scheduled)
    if (!pendingInvalidateRef.current) {
      const delay = REALTIME_THROTTLE_MS - timeSinceLastInvalidate;
      pendingInvalidateRef.current = setTimeout(() => {
        lastInvalidateRef.current = Date.now();
        pendingInvalidateRef.current = null;
        queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-conversations'] });
        queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-stats'] });
      }, delay);
    }
  }, [queryClient]);

  // Real-time subscription with throttling - only for INSERT events
  useEffect(() => {
    const channel = supabase
      .channel('admin-whatsapp-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Only listen to new messages, not all events
          schema: 'public',
          table: 'whatsapp_messages'
        },
        () => {
          // Use throttled invalidation to prevent too many refetches
          throttledInvalidate();
        }
      )
      .subscribe();

    return () => {
      // Cleanup pending timeout on unmount
      if (pendingInvalidateRef.current) {
        clearTimeout(pendingInvalidateRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [throttledInvalidate]);

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

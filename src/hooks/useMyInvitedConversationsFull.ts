import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InvitedConversationFull {
  phone_number: string;
  bitrix_id: string | null;
  priority: number;
  inviter_name: string | null;
  invited_at: string;
  invited_by: string | null;
  lead_name: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  is_window_open: boolean;
  unread_count: number;
  lead_etapa: string | null;
  response_status: string | null;
}

export const useMyInvitedConversationsFull = () => {
  const query = useQuery({
    queryKey: ['my-invited-conversations-full'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase.rpc('get_my_invited_conversations_full', {
        p_operator_id: user.id,
      });

      if (error) {
        console.error('Error fetching full invited conversations:', error);
        throw error; // Throw instead of returning [] so error state is exposed
      }

      return (data || []) as InvitedConversationFull[];
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InvitedConversation {
  phone_number: string;
  bitrix_id: string | null;
  priority: number;
  invited_by: string | null;
  inviter_name: string | null;
  invited_at: string;
}

export const useMyInvitedConversations = () => {
  return useQuery({
    queryKey: ['my-invited-conversations'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase.rpc('get_my_invited_conversations', {
        p_operator_id: user.id,
      });

      if (error) {
        console.error('Error fetching invited conversations:', error);
        return [];
      }

      return (data || []) as InvitedConversation[];
    },
    staleTime: 30000,
  });
};

// Helper to check if current user was invited to a specific conversation
export const useIsInvitedToConversation = (phoneNumber: string | undefined) => {
  const { data: invitedConversations = [] } = useMyInvitedConversations();

  if (!phoneNumber) return null;

  return invitedConversations.find(c => c.phone_number === phoneNumber) || null;
};

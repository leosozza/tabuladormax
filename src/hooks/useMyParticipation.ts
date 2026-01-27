import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MyParticipation {
  id: string;
  phone_number: string;
  bitrix_id: string | null;
  operator_id: string;
  invited_by: string | null;
  inviter_name: string | null;
  invited_at: string;
  priority: number;
  role: string;
}

/**
 * Check if current user is a participant (invited) in a conversation
 */
export const useMyParticipation = (phoneNumber: string | undefined) => {
  return useQuery({
    queryKey: ['my-participation', phoneNumber],
    queryFn: async () => {
      if (!phoneNumber) return null;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('whatsapp_conversation_participants' as any)
        .select('*')
        .eq('phone_number', phoneNumber)
        .eq('operator_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as MyParticipation | null;
    },
    enabled: !!phoneNumber,
    staleTime: 30000,
  });
};

/**
 * Mark my participation as resolved (remove myself from conversation)
 */
export const useResolveMyParticipation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      phoneNumber,
      participationId,
    }: {
      phoneNumber: string;
      participationId: string;
    }) => {
      const { error } = await supabase
        .from('whatsapp_conversation_participants' as any)
        .delete()
        .eq('id', participationId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success('Participação encerrada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['my-participation', variables.phoneNumber] });
      queryClient.invalidateQueries({ queryKey: ['conversation-participants', variables.phoneNumber] });
      queryClient.invalidateQueries({ queryKey: ['my-invited-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-conversations'] });
    },
    onError: (error) => {
      console.error('Error resolving participation:', error);
      toast.error('Erro ao encerrar participação');
    },
  });
};

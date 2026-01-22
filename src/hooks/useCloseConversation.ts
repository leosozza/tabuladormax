import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConversationClosure {
  id: string;
  phone_number: string;
  bitrix_id: string | null;
  closed_at: string;
  closed_by: string | null;
  closure_reason: string | null;
  reopened_at: string | null;
}

export const useConversationClosure = (phoneNumber: string | undefined) => {
  return useQuery({
    queryKey: ['conversation-closure', phoneNumber],
    queryFn: async () => {
      if (!phoneNumber) return null;

      const { data, error } = await supabase
        .from('whatsapp_conversation_closures' as any)
        .select('*')
        .eq('phone_number', phoneNumber)
        .is('reopened_at', null)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as ConversationClosure | null;
    },
    enabled: !!phoneNumber,
    staleTime: 30000,
  });
};

export const useCloseConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      phoneNumber,
      bitrixId,
      reason,
    }: {
      phoneNumber: string;
      bitrixId?: string;
      reason?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // First, try to delete any existing closure for this phone
      await supabase
        .from('whatsapp_conversation_closures' as any)
        .delete()
        .eq('phone_number', phoneNumber);

      // Then insert a new closure
      const { data, error } = await supabase
        .from('whatsapp_conversation_closures' as any)
        .insert({
          phone_number: phoneNumber,
          bitrix_id: bitrixId || null,
          closed_by: user?.id || null,
          closure_reason: reason || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success('Conversa encerrada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['conversation-closure', variables.phoneNumber] });
      queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-stats'] });
    },
    onError: (error) => {
      console.error('Error closing conversation:', error);
      toast.error('Erro ao encerrar conversa');
    },
  });
};

export const useReopenConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (phoneNumber: string) => {
      const { data, error } = await supabase
        .from('whatsapp_conversation_closures' as any)
        .update({ reopened_at: new Date().toISOString() })
        .eq('phone_number', phoneNumber)
        .is('reopened_at', null)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, phoneNumber) => {
      toast.success('Conversa reaberta com sucesso');
      queryClient.invalidateQueries({ queryKey: ['conversation-closure', phoneNumber] });
      queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-stats'] });
    },
    onError: (error) => {
      console.error('Error reopening conversation:', error);
      toast.error('Erro ao reabrir conversa');
    },
  });
};

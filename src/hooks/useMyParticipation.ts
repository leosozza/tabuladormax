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
 * Now saves resolution notes before removing
 */
export const useResolveMyParticipation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      phoneNumber,
      participationId,
      notes,
    }: {
      phoneNumber: string;
      participationId: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Buscar dados do participante antes de deletar
      const { data: participationData, error: fetchError } = await supabase
        .from('whatsapp_conversation_participants' as any)
        .select('*')
        .eq('id', participationId)
        .single();

      if (fetchError) throw fetchError;
      
      const participation = participationData as unknown as MyParticipation;

      // Buscar nome do operador
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle();

      // 2. Inserir histórico de resolução
      const { error: insertError } = await supabase
        .from('whatsapp_participation_resolutions' as any)
        .insert({
          phone_number: phoneNumber,
          bitrix_id: participation?.bitrix_id || null,
          operator_id: user.id,
          operator_name: profile?.display_name || user.email?.split('@')[0] || 'Operador',
          resolution_notes: notes?.trim() || null,
          invited_by: participation?.invited_by || null,
          inviter_name: participation?.inviter_name || null,
          priority: participation?.priority || null,
        });

      if (insertError) {
        console.error('Erro ao salvar histórico de resolução:', insertError);
        // Continue mesmo se falhar - não bloquear a remoção
      }

      // 3. Deletar participação
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
      queryClient.invalidateQueries({ queryKey: ['resolution-history', variables.phoneNumber] });
    },
    onError: (error) => {
      console.error('Error resolving participation:', error);
      toast.error('Erro ao encerrar participação');
    },
  });
};

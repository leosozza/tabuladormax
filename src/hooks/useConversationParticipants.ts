import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Participant {
  id: string;
  phone_number: string;
  bitrix_id: string | null;
  operator_id: string;
  invited_by: string | null;
  invited_at: string;
  role: string;
  operator?: {
    id: string;
    full_name: string | null;
    photo_url: string | null;
  };
}

export const useConversationParticipants = (phoneNumber: string | undefined) => {
  return useQuery({
    queryKey: ['conversation-participants', phoneNumber],
    queryFn: async () => {
      if (!phoneNumber) return [];

      // Step 1: Fetch participants without FK join (avoids schema cache issues)
      const { data: participantsData, error: participantsError } = await supabase
        .from('whatsapp_conversation_participants' as any)
        .select('id, phone_number, bitrix_id, operator_id, invited_by, invited_at, role')
        .eq('phone_number', phoneNumber);

      if (participantsError) throw participantsError;
      if (!participantsData || participantsData.length === 0) return [];

      // Step 2: Get unique operator IDs
      const operatorIds = [...new Set(
        participantsData
          .map((p: any) => p.operator_id)
          .filter((id: string | null): id is string => !!id)
      )];

      // Step 3: Fetch profiles for these operators
      let profilesMap: Record<string, { id: string; display_name: string | null }> = {};
      if (operatorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', operatorIds);
        
        (profilesData || []).forEach((profile: any) => {
          profilesMap[profile.id] = profile;
        });
      }

      // Step 4: Enrich participants with profile data
      return participantsData.map((p: any): Participant => ({
        id: p.id,
        phone_number: p.phone_number,
        bitrix_id: p.bitrix_id,
        operator_id: p.operator_id,
        invited_by: p.invited_by,
        invited_at: p.invited_at,
        role: p.role,
        operator: p.operator_id && profilesMap[p.operator_id] ? {
          id: profilesMap[p.operator_id].id,
          full_name: profilesMap[p.operator_id].display_name, // Map display_name to full_name for compatibility
          photo_url: null // profiles table doesn't have photo_url
        } : undefined
      }));
    },
    enabled: !!phoneNumber,
    staleTime: 30000,
  });
};

export const useInviteParticipant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      phoneNumber,
      bitrixId,
      operatorId,
      operatorName,
      priority = 0,
    }: {
      phoneNumber: string;
      bitrixId?: string;
      operatorId: string;
      operatorName?: string;
      priority?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get current user's display name for inviter_name
      let inviterName = null;
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single() as { data: { display_name: string | null } | null; error: any };
        inviterName = profile?.display_name || null;
      }
      
      // Insert participant
      const { data, error } = await supabase
        .from('whatsapp_conversation_participants' as any)
        .insert({
          phone_number: phoneNumber,
          bitrix_id: bitrixId || null,
          operator_id: operatorId,
          invited_by: user?.id || null,
          inviter_name: inviterName,
          priority: priority,
          role: 'participant',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Este operador já está participando desta conversa');
        }
        throw error;
      }

      // Create notification for the invited operator
      const { error: notifError } = await supabase
        .from('whatsapp_operator_notifications' as any)
        .insert({
          operator_id: operatorId,
          type: 'conversation_invite',
          title: 'Você foi convidado para uma conversa',
          message: `Você foi adicionado à conversa com ${phoneNumber}`,
          phone_number: phoneNumber,
          bitrix_id: bitrixId || null,
        });

      if (notifError) {
        console.error('Error creating notification:', notifError);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      toast.success('Operador convidado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['conversation-participants', variables.phoneNumber] });
    },
    onError: (error: Error) => {
      console.error('Error inviting participant:', error);
      toast.error(error.message || 'Erro ao convidar operador');
    },
  });
};

export const useRemoveParticipant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      phoneNumber,
      participantId,
    }: {
      phoneNumber: string;
      participantId: string;
    }) => {
      const { error } = await supabase
        .from('whatsapp_conversation_participants' as any)
        .delete()
        .eq('id', participantId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success('Participante removido');
      queryClient.invalidateQueries({ queryKey: ['conversation-participants', variables.phoneNumber] });
    },
    onError: (error) => {
      console.error('Error removing participant:', error);
      toast.error('Erro ao remover participante');
    },
  });
};

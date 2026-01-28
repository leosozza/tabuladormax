import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface InternalNote {
  id: string;
  phone_number: string;
  bitrix_id: string | null;
  author_id: string;
  author_name: string | null;
  content: string;
  created_at: string;
  target_operator_id: string | null;
}

/**
 * Hook para buscar notas internas de uma conversa
 */
export const useInternalNotes = (phoneNumber: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading, refetch } = useQuery({
    queryKey: ['internal-notes', phoneNumber],
    queryFn: async () => {
      if (!phoneNumber) return [];

      const { data, error } = await supabase
        .from('whatsapp_internal_notes' as any)
        .select('*')
        .eq('phone_number', phoneNumber)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as InternalNote[];
    },
    enabled: !!phoneNumber,
    staleTime: 10000,
  });

  // Real-time subscription para novas notas
  useEffect(() => {
    if (!phoneNumber) return;

    const channel = supabase
      .channel(`internal-notes-${phoneNumber}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_internal_notes',
          filter: `phone_number=eq.${phoneNumber}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['internal-notes', phoneNumber] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [phoneNumber, queryClient]);

  return {
    notes,
    isLoading,
    refetch,
  };
};

/**
 * Hook para enviar uma nota interna
 */
export const useSendInternalNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      phoneNumber,
      bitrixId,
      content,
      targetOperatorId,
    }: {
      phoneNumber: string;
      bitrixId?: string;
      content: string;
      targetOperatorId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar nome do autor
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle();

      const { error } = await supabase
        .from('whatsapp_internal_notes' as any)
        .insert({
          phone_number: phoneNumber,
          bitrix_id: bitrixId || null,
          author_id: user.id,
          author_name: profile?.display_name || user.email?.split('@')[0] || 'Operador',
          content: content.trim(),
          target_operator_id: targetOperatorId || null,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['internal-notes', variables.phoneNumber] });
    },
    onError: (error) => {
      console.error('Erro ao enviar nota interna:', error);
      toast.error('Erro ao enviar nota interna');
    },
  });
};

/**
 * Hook para buscar histórico de resoluções de uma conversa
 */
export interface ResolutionHistory {
  id: string;
  phone_number: string;
  bitrix_id: string | null;
  operator_id: string;
  operator_name: string | null;
  resolution_notes: string | null;
  resolved_at: string;
  invited_by: string | null;
  inviter_name: string | null;
  priority: number | null;
}

export const useResolutionHistory = (phoneNumber: string | undefined) => {
  return useQuery({
    queryKey: ['resolution-history', phoneNumber],
    queryFn: async () => {
      if (!phoneNumber) return [];

      const { data, error } = await supabase
        .from('whatsapp_participation_resolutions' as any)
        .select('*')
        .eq('phone_number', phoneNumber)
        .order('resolved_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ResolutionHistory[];
    },
    enabled: !!phoneNumber,
    staleTime: 30000,
  });
};

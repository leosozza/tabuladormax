import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para contar notas internas não lidas de uma conversa
 * "Não lidas" = notas criadas por outros usuários que o operador ainda não viu
 */
export const useUnreadInternalNotes = (phoneNumber: string | undefined, isActive: boolean) => {
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [lastSeenAt, setLastSeenAt] = useState<Date | null>(null);

  // Pegar ID do usuário logado
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();
  }, []);

  // Quando o tab de notas fica ativo, marcar como "visto"
  useEffect(() => {
    if (isActive && phoneNumber) {
      setLastSeenAt(new Date());
      // Salvar no localStorage para persistir entre sessões
      localStorage.setItem(`notes-seen-${phoneNumber}`, new Date().toISOString());
    }
  }, [isActive, phoneNumber]);

  // Carregar última visualização do localStorage
  useEffect(() => {
    if (phoneNumber) {
      const saved = localStorage.getItem(`notes-seen-${phoneNumber}`);
      if (saved) {
        setLastSeenAt(new Date(saved));
      }
    }
  }, [phoneNumber]);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-internal-notes', phoneNumber, currentUserId, lastSeenAt?.toISOString()],
    queryFn: async () => {
      if (!phoneNumber || !currentUserId) return 0;

      // Contar notas de outros usuários que foram criadas após a última visualização
      let query = supabase
        .from('whatsapp_internal_notes' as any)
        .select('id', { count: 'exact', head: true })
        .eq('phone_number', phoneNumber)
        .neq('author_id', currentUserId); // Excluir notas do próprio usuário

      // Se tiver data de última visualização, filtrar por notas mais recentes
      if (lastSeenAt) {
        query = query.gt('created_at', lastSeenAt.toISOString());
      }

      const { count, error } = await query;

      if (error) {
        console.error('Erro ao contar notas não lidas:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!phoneNumber && !!currentUserId,
    staleTime: 5000,
  });

  // Real-time subscription para novas notas
  useEffect(() => {
    if (!phoneNumber) return;

    const channel = supabase
      .channel(`unread-notes-count-${phoneNumber}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_internal_notes',
          filter: `phone_number=eq.${phoneNumber}`,
        },
        () => {
          queryClient.invalidateQueries({ 
            queryKey: ['unread-internal-notes', phoneNumber] 
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [phoneNumber, queryClient]);

  return {
    unreadCount,
    hasUnread: unreadCount > 0,
    markAsSeen: () => setLastSeenAt(new Date()),
  };
};

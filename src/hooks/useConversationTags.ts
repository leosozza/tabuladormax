import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ConversationTag {
  id: string;
  name: string;
  color: string;
  created_by: string | null;
  created_at: string;
}

export interface TagAssignment {
  id: string;
  name: string;
  color: string;
  assigned_at: string;
  assigned_by: string | null;
}

// Fetch all available tags
export const useAllTags = () => {
  return useQuery({
    queryKey: ['conversation-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversation_tags' as any)
        .select('id, name, color, created_by, created_at')
        .order('name') as { data: ConversationTag[] | null; error: any };

      if (error) throw error;
      return (data || []) as ConversationTag[];
    },
    staleTime: 120000, // Tags rarely change
  });
};

// Fetch tags for a specific conversation
export const useConversationTags = (phoneNumber: string | undefined) => {
  return useQuery({
    queryKey: ['conversation-tags', phoneNumber],
    queryFn: async () => {
      if (!phoneNumber) return [];

      const { data, error } = await supabase.rpc('get_conversation_tags', {
        p_phone_number: phoneNumber,
      });

      if (error) throw error;
      return (data || []) as TagAssignment[];
    },
    enabled: !!phoneNumber,
    staleTime: 60000,
  });
};

// Create a new tag
export const useCreateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const { data, error } = await supabase
        .from('whatsapp_conversation_tags' as any)
        .insert({ name, color })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Etiqueta criada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['conversation-tags'] });
    },
    onError: (error: Error) => {
      console.error('Error creating tag:', error);
      toast.error('Erro ao criar etiqueta');
    },
  });
};

// Delete a tag
export const useDeleteTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from('whatsapp_conversation_tags' as any)
        .delete()
        .eq('id', tagId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Etiqueta removida');
      queryClient.invalidateQueries({ queryKey: ['conversation-tags'] });
    },
    onError: (error: Error) => {
      console.error('Error deleting tag:', error);
      toast.error('Erro ao remover etiqueta');
    },
  });
};

// Assign tag to conversation
export const useAssignTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      phoneNumber,
      bitrixId,
      tagId,
    }: {
      phoneNumber: string;
      bitrixId?: string;
      tagId: string;
    }) => {
      const { data, error } = await supabase
        .from('whatsapp_conversation_tag_assignments' as any)
        .insert({
          phone_number: phoneNumber,
          bitrix_id: bitrixId || null,
          tag_id: tagId,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Esta etiqueta já foi atribuída a esta conversa');
        }
        throw error;
      }
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success('Etiqueta atribuída');
      queryClient.invalidateQueries({ queryKey: ['conversation-tags', variables.phoneNumber] });
    },
    onError: (error: Error) => {
      console.error('Error assigning tag:', error);
      toast.error(error.message || 'Erro ao atribuir etiqueta');
    },
  });
};

// Remove tag from conversation
export const useRemoveTagAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      phoneNumber,
      tagId,
    }: {
      phoneNumber: string;
      tagId: string;
    }) => {
      const { error } = await supabase
        .from('whatsapp_conversation_tag_assignments' as any)
        .delete()
        .eq('phone_number', phoneNumber)
        .eq('tag_id', tagId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success('Etiqueta removida da conversa');
      queryClient.invalidateQueries({ queryKey: ['conversation-tags', variables.phoneNumber] });
    },
    onError: (error: Error) => {
      console.error('Error removing tag assignment:', error);
      toast.error('Erro ao remover etiqueta');
    },
  });
};

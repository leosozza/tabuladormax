import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ConversationLabel {
  id: string;
  name: string;
  color: string;
  created_at: string;
  created_by: string | null;
}

export interface LabelAssignment {
  id: string;
  conversation_id: number;
  label_id: string;
  assigned_at: string;
  assigned_by: string | null;
  label?: ConversationLabel;
}

export function useConversationLabels(conversationId?: number | null) {
  const [labels, setLabels] = useState<ConversationLabel[]>([]);
  const [assignedLabels, setAssignedLabels] = useState<LabelAssignment[]>([]);
  const [loading, setLoading] = useState(false);

  // Buscar todas as labels disponíveis
  const fetchLabels = async () => {
    try {
      const { data, error } = await supabase
        .from('conversation_labels')
        .select('*')
        .order('name');

      if (error) throw error;
      setLabels(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar labels:', error);
      toast.error('Erro ao carregar etiquetas');
    }
  };

  // Buscar labels atribuídas a uma conversa específica
  const fetchAssignedLabels = async (convId: number) => {
    try {
      const { data, error } = await supabase
        .from('conversation_label_assignments')
        .select(`
          *,
          label:conversation_labels(*)
        `)
        .eq('conversation_id', convId);

      if (error) throw error;
      setAssignedLabels(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar labels atribuídas:', error);
    }
  };

  // Atribuir label a uma conversa
  const assignLabel = async (convId: number, labelId: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('conversation_label_assignments')
        .insert({
          conversation_id: convId,
          label_id: labelId,
          assigned_by: user?.id,
        });

      if (error) throw error;
      
      await fetchAssignedLabels(convId);
      toast.success('Etiqueta adicionada');
    } catch (error: any) {
      console.error('Erro ao atribuir label:', error);
      toast.error('Erro ao adicionar etiqueta');
    } finally {
      setLoading(false);
    }
  };

  // Remover label de uma conversa
  const removeLabel = async (convId: number, labelId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('conversation_label_assignments')
        .delete()
        .eq('conversation_id', convId)
        .eq('label_id', labelId);

      if (error) throw error;
      
      await fetchAssignedLabels(convId);
      toast.success('Etiqueta removida');
    } catch (error: any) {
      console.error('Erro ao remover label:', error);
      toast.error('Erro ao remover etiqueta');
    } finally {
      setLoading(false);
    }
  };

  // Toggle label (adiciona se não existe, remove se existe)
  const toggleLabel = async (convId: number, labelId: string) => {
    const isAssigned = assignedLabels.some(
      (a) => a.label_id === labelId && a.conversation_id === convId
    );

    if (isAssigned) {
      await removeLabel(convId, labelId);
    } else {
      await assignLabel(convId, labelId);
    }
  };

  // Buscar labels atribuídas a múltiplas conversas
  const fetchLabelsForConversations = async (conversationIds: number[]) => {
    try {
      const { data, error } = await supabase
        .from('conversation_label_assignments')
        .select(`
          *,
          label:conversation_labels(*)
        `)
        .in('conversation_id', conversationIds);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Erro ao buscar labels das conversas:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchLabels();
  }, []);

  useEffect(() => {
    if (conversationId) {
      fetchAssignedLabels(conversationId);
    }
  }, [conversationId]);

  return {
    labels,
    assignedLabels,
    loading,
    assignLabel,
    removeLabel,
    toggleLabel,
    fetchLabels,
    fetchAssignedLabels,
    fetchLabelsForConversations,
  };
}

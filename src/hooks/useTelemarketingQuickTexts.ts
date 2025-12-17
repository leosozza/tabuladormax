import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface QuickText {
  id: string;
  title: string;
  content: string;
  category: string;
  shortcut: string | null;
  commercial_project_id: string | null;
  is_active: boolean;
  priority: number;
  usage_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type QuickTextInsert = Omit<QuickText, 'id' | 'created_at' | 'updated_at' | 'usage_count'>;
export type QuickTextUpdate = Partial<QuickTextInsert>;

export const QUICK_TEXT_CATEGORIES = [
  { value: 'saudacao', label: 'Saudação', emoji: '👋' },
  { value: 'despedida', label: 'Despedida', emoji: '🙏' },
  { value: 'info', label: 'Informação', emoji: 'ℹ️' },
  { value: 'objecao', label: 'Objeção', emoji: '💬' },
  { value: 'preco', label: 'Preço', emoji: '💰' },
  { value: 'geral', label: 'Geral', emoji: '📝' },
] as const;

export function useQuickTexts(projectId?: string) {
  return useQuery({
    queryKey: ['quick-texts', projectId],
    queryFn: async () => {
      let query = supabase
        .from('telemarketing_quick_texts')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('usage_count', { ascending: false });

      if (projectId) {
        query = query.eq('commercial_project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as QuickText[];
    },
    enabled: true,
  });
}

export function useAllQuickTexts(projectId?: string) {
  return useQuery({
    queryKey: ['quick-texts-all', projectId],
    queryFn: async () => {
      let query = supabase
        .from('telemarketing_quick_texts')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('commercial_project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as QuickText[];
    },
    enabled: true,
  });
}

export function useCreateQuickText() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quickText: QuickTextInsert) => {
      const { data, error } = await supabase
        .from('telemarketing_quick_texts')
        .insert(quickText)
        .select()
        .single();

      if (error) throw error;
      return data as QuickText;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-texts'] });
      queryClient.invalidateQueries({ queryKey: ['quick-texts-all'] });
      toast.success('Texto rápido criado!');
    },
    onError: () => {
      toast.error('Erro ao criar texto rápido');
    },
  });
}

export function useUpdateQuickText() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: QuickTextUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('telemarketing_quick_texts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as QuickText;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-texts'] });
      queryClient.invalidateQueries({ queryKey: ['quick-texts-all'] });
      toast.success('Texto rápido atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar texto rápido');
    },
  });
}

export function useDeleteQuickText() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('telemarketing_quick_texts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-texts'] });
      queryClient.invalidateQueries({ queryKey: ['quick-texts-all'] });
      toast.success('Texto rápido excluído!');
    },
    onError: () => {
      toast.error('Erro ao excluir texto rápido');
    },
  });
}

export function useIncrementQuickTextUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: current } = await supabase
        .from('telemarketing_quick_texts')
        .select('usage_count')
        .eq('id', id)
        .single();

      if (current) {
        await supabase
          .from('telemarketing_quick_texts')
          .update({ usage_count: (current.usage_count || 0) + 1 })
          .eq('id', id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-texts'] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UnifiedFieldConfig {
  id: string;
  supabase_field: string;
  supabase_type: string | null;
  is_nullable: string | null;
  bitrix_field: string | null;
  bitrix_field_type: string | null;
  transform_function: string | null;
  sync_active: boolean;
  sync_priority: number;
  display_name: string | null;
  category: string | null;
  field_type: string | null;
  default_visible: boolean;
  sortable: boolean;
  ui_priority: number;
  formatter_function: string | null;
  ui_active: boolean;
  is_hidden: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

type ConfigType = 'sync' | 'ui' | 'all';

export const useUnifiedFieldConfig = (type: ConfigType = 'all') => {
  return useQuery({
    queryKey: ['unified-field-config', type],
    queryFn: async () => {
      let query = supabase
        .from('unified_field_config')
        .select('*');
      
      if (type === 'sync') {
        query = query.eq('sync_active', true).order('sync_priority');
      } else if (type === 'ui') {
        query = query.eq('ui_active', true).order('ui_priority');
      } else {
        query = query.order('supabase_field');
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as UnifiedFieldConfig[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

export const useUpdateFieldConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<UnifiedFieldConfig> }) => {
      const { data, error } = await supabase
        .from('unified_field_config')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-field-config'] });
      toast.success('Configuração atualizada com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao atualizar configuração:', error);
      toast.error('Erro ao atualizar configuração');
    },
  });
};

export const useCreateFieldConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (config: any) => {
      const { data, error } = await supabase
        .from('unified_field_config')
        .insert([config])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-field-config'] });
      toast.success('Campo configurado com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao criar configuração:', error);
      toast.error('Erro ao criar configuração');
    },
  });
};

export const useDeleteFieldConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('unified_field_config')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-field-config'] });
      toast.success('Campo removido com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao remover campo:', error);
      toast.error('Erro ao remover campo');
    },
  });
};

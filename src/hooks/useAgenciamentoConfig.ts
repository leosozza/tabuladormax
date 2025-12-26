import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AgenciamentoConfig {
  id: string;
  config_key: string;
  config_value: string;
  description: string | null;
  is_active: boolean;
  priority: number;
  category: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export function useAgenciamentoConfig() {
  return useQuery({
    queryKey: ['agenciamento-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agenciamento_assistant_config')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as AgenciamentoConfig[];
    },
  });
}

export function useUpdateAgenciamentoConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AgenciamentoConfig> & { id: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('agenciamento_assistant_config')
        .update({ 
          ...updates, 
          updated_by: userData?.user?.id 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenciamento-config'] });
      toast.success("Configuração atualizada!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });
}

export function useCreateAgenciamentoConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Omit<AgenciamentoConfig, 'id' | 'created_at' | 'updated_at' | 'updated_by'>) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('agenciamento_assistant_config')
        .insert({ 
          ...config, 
          updated_by: userData?.user?.id 
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenciamento-config'] });
      toast.success("Regra criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar: ${error.message}`);
    },
  });
}

export function useDeleteAgenciamentoConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agenciamento_assistant_config')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenciamento-config'] });
      toast.success("Regra excluída!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });
}

export function useToggleAgenciamentoConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('agenciamento_assistant_config')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenciamento-config'] });
      toast.success("Status atualizado!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });
}

// Helper para gerar o prompt completo a partir das configurações
export function buildPromptFromConfig(configs: AgenciamentoConfig[]): string {
  const activeConfigs = configs
    .filter(c => c.is_active)
    .sort((a, b) => b.priority - a.priority);
  
  return activeConfigs.map(c => c.config_value).join('\n\n');
}

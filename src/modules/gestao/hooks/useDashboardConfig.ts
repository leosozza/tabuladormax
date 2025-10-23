/**
 * Hook para gerenciar configurações de dashboard no Supabase
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardConfig } from '@/types/dashboard';
import { useToast } from '@/hooks/use-toast';

export function useDashboardConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Buscar todas as configurações do usuário
  const { data: configs, isLoading, error } = useQuery({
    queryKey: ['dashboard-configs'],
    queryFn: async (): Promise<DashboardConfig[]> => {
      const { data, error } = await supabase
        .from('dashboard_configs')
        .select('*')
        .order('is_default', { ascending: false })
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      return data.map(config => {
        const configData = config.config as any;
        return {
          ...config,
          widgets: configData?.widgets || []
        };
      });
    }
  });
  
  // Buscar configuração padrão
  const { data: defaultConfig } = useQuery({
    queryKey: ['dashboard-config-default'],
    queryFn: async (): Promise<DashboardConfig | null> => {
      const { data, error } = await supabase
        .from('dashboard_configs')
        .select('*')
        .eq('is_default', true)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      const configData = data.config as any;
      return {
        ...data,
        widgets: configData?.widgets || []
      };
    }
  });
  
  // Salvar nova configuração
  const saveDashboard = useMutation({
    mutationFn: async (config: Omit<DashboardConfig, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      
      const { data, error} = await supabase
        .from('dashboard_configs')
        .insert({
          user_id: user.id,
          name: config.name,
          description: config.description,
          config: { widgets: config.widgets } as any,
          is_default: config.is_default || false
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-configs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-config-default'] });
      toast({
        title: 'Dashboard salvo',
        description: 'Sua configuração foi salva com sucesso.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Atualizar configuração existente
  const updateDashboard = useMutation({
    mutationFn: async (config: DashboardConfig) => {
      const { data, error } = await supabase
        .from('dashboard_configs')
        .update({
          name: config.name,
          description: config.description,
          config: { widgets: config.widgets } as any,
          is_default: config.is_default || false,
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-configs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-config-default'] });
      toast({
        title: 'Dashboard atualizado',
        description: 'Suas alterações foram salvas.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Deletar configuração
  const deleteDashboard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dashboard_configs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-configs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-config-default'] });
      toast({
        title: 'Dashboard excluído',
        description: 'Configuração removida com sucesso.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Definir como padrão
  const setAsDefault = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      
      // Remover padrão de todos
      await supabase
        .from('dashboard_configs')
        .update({ is_default: false })
        .eq('user_id', user.id);
      
      // Definir novo padrão
      const { error } = await supabase
        .from('dashboard_configs')
        .update({ is_default: true })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-configs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-config-default'] });
      toast({
        title: 'Dashboard padrão definido',
        description: 'Este dashboard será exibido por padrão.'
      });
    }
  });
  
  return {
    configs: configs || [],
    defaultConfig,
    isLoading,
    error,
    saveDashboard,
    updateDashboard,
    deleteDashboard,
    setAsDefault
  };
}

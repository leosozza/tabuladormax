import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { IndicatorConfig } from '@/types/indicator';
import { DEFAULT_INDICATORS } from '@/types/indicator';
import { useToast } from '@/hooks/use-toast';

export function useIndicatorConfigs() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: configs, isLoading } = useQuery({
    queryKey: ['indicator-configs'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return DEFAULT_INDICATORS;

      const { data, error } = await supabase
        .from('dashboard_indicator_configs')
        .select('*')
        .eq('user_id', user.id)
        .order('position');

      if (error) {
        console.error('Erro ao carregar configs:', error);
        return DEFAULT_INDICATORS;
      }

      return data.length > 0 ? data : DEFAULT_INDICATORS;
    },
  });

  const saveConfig = useMutation({
    mutationFn: async (config: Partial<IndicatorConfig>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const payload: any = {
        indicator_key: config.indicator_key,
        title: config.title,
        source_column: config.source_column,
        aggregation: config.aggregation,
        chart_type: config.chart_type,
        format: config.format,
        position: config.position,
        user_id: user.id,
      };

      if (config.filter_condition) {
        payload.filter_condition = config.filter_condition;
      }

      if (config.id) {
        payload.id = config.id;
      }

      const { data, error } = await supabase
        .from('dashboard_indicator_configs')
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indicator-configs'] });
      toast({
        title: 'Configuração salva',
        description: 'Indicador atualizado com sucesso',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteConfig = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dashboard_indicator_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indicator-configs'] });
      toast({
        title: 'Indicador removido',
        description: 'O indicador foi removido com sucesso',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetToDefaults = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('dashboard_indicator_configs')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indicator-configs'] });
      toast({
        title: 'Configurações resetadas',
        description: 'Indicadores restaurados para o padrão',
      });
    },
  });

  return {
    configs: configs || DEFAULT_INDICATORS,
    isLoading,
    saveConfig,
    deleteConfig,
    resetToDefaults,
  };
}

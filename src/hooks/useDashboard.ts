/**
 * Hook para gerenciar dashboards com persistência no banco de dados
 * Usa React Query para cache e atualização otimista
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardConfig, DashboardWidget } from '@/types/dashboard';
import { toast } from 'sonner';

// Tipos para o banco de dados
interface DashboardConfigDB {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_default?: boolean;
  theme?: any;
  layout?: any;
  auto_refresh?: boolean;
  refresh_interval?: number;
  created_at?: string;
  updated_at?: string;
}

interface DashboardWidgetDB {
  id: string;
  dashboard_id: string;
  widget_config: DashboardWidget;
  position: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Converte DashboardConfig para formato do banco
 */
function configToDb(config: DashboardConfig, userId: string): Omit<DashboardConfigDB, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: userId,
    name: config.name,
    description: config.description,
    is_default: config.is_default,
    theme: config.theme,
    layout: config.layout,
    auto_refresh: config.autoRefresh,
    refresh_interval: config.refreshInterval,
  };
}

/**
 * Converte DashboardConfigDB para DashboardConfig
 */
function configFromDb(db: DashboardConfigDB, widgets: DashboardWidget[]): DashboardConfig {
  return {
    id: db.id,
    user_id: db.user_id,
    name: db.name,
    description: db.description,
    widgets,
    is_default: db.is_default,
    created_at: db.created_at,
    updated_at: db.updated_at,
    theme: db.theme,
    layout: db.layout,
    autoRefresh: db.auto_refresh,
    refreshInterval: db.refresh_interval,
  };
}

/**
 * Hook principal para gerenciar dashboards
 */
export function useDashboard() {
  const queryClient = useQueryClient();

  // Buscar todos os dashboards do usuário
  const { data: dashboards, isLoading } = useQuery({
    queryKey: ['dashboards'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar configs
      const { data: configs, error: configError } = await supabase
        .from('dashboard_configs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (configError) throw configError;
      if (!configs) return [];

      // Buscar widgets para cada dashboard
      const dashboardsWithWidgets = await Promise.all(
        configs.map(async (config) => {
          const { data: widgetsData, error: widgetsError } = await supabase
            .from('dashboard_widgets')
            .select('*')
            .eq('dashboard_id', config.id)
            .order('position', { ascending: true });

          if (widgetsError) throw widgetsError;

          const widgets = (widgetsData || []).map(w => w.widget_config as DashboardWidget);
          return configFromDb(config, widgets);
        })
      );

      return dashboardsWithWidgets;
    },
  });

  // Buscar dashboard por ID
  const getDashboard = async (id: string): Promise<DashboardConfig | null> => {
    const { data: config, error: configError } = await supabase
      .from('dashboard_configs')
      .select('*')
      .eq('id', id)
      .single();

    if (configError) throw configError;
    if (!config) return null;

    const { data: widgetsData, error: widgetsError } = await supabase
      .from('dashboard_widgets')
      .select('*')
      .eq('dashboard_id', id)
      .order('position', { ascending: true });

    if (widgetsError) throw widgetsError;

    const widgets = (widgetsData || []).map(w => w.widget_config as DashboardWidget);
    return configFromDb(config, widgets);
  };

  // Criar novo dashboard
  const createDashboard = useMutation({
    mutationFn: async (config: Omit<DashboardConfig, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Criar config
      const { data: configData, error: configError } = await supabase
        .from('dashboard_configs')
        .insert([configToDb(config as DashboardConfig, user.id)])
        .select()
        .single();

      if (configError) throw configError;
      if (!configData) throw new Error('Erro ao criar dashboard');

      // Criar widgets
      if (config.widgets && config.widgets.length > 0) {
        const widgetsToInsert = config.widgets.map((widget, index) => ({
          dashboard_id: configData.id,
          widget_config: widget,
          position: index,
        }));

        const { error: widgetsError } = await supabase
          .from('dashboard_widgets')
          .insert(widgetsToInsert);

        if (widgetsError) throw widgetsError;
      }

      return configFromDb(configData, config.widgets || []);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      toast.success('Dashboard criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar dashboard: ${error.message}`);
    },
  });

  // Atualizar dashboard existente
  const updateDashboard = useMutation({
    mutationFn: async ({ id, config }: { id: string; config: Partial<DashboardConfig> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Atualizar config
      const { error: configError } = await supabase
        .from('dashboard_configs')
        .update(configToDb({ ...config, id } as DashboardConfig, user.id))
        .eq('id', id);

      if (configError) throw configError;

      // Se widgets foram atualizados, deletar antigos e inserir novos
      if (config.widgets) {
        // Deletar widgets antigos
        const { error: deleteError } = await supabase
          .from('dashboard_widgets')
          .delete()
          .eq('dashboard_id', id);

        if (deleteError) throw deleteError;

        // Inserir novos widgets
        if (config.widgets.length > 0) {
          const widgetsToInsert = config.widgets.map((widget, index) => ({
            dashboard_id: id,
            widget_config: widget,
            position: index,
          }));

          const { error: widgetsError } = await supabase
            .from('dashboard_widgets')
            .insert(widgetsToInsert);

          if (widgetsError) throw widgetsError;
        }
      }

      return getDashboard(id);
    },
    onMutate: async ({ id, config }) => {
      // Cancelar queries pendentes
      await queryClient.cancelQueries({ queryKey: ['dashboards'] });

      // Snapshot do estado anterior
      const previousDashboards = queryClient.getQueryData<DashboardConfig[]>(['dashboards']);

      // Atualização otimista
      if (previousDashboards) {
        queryClient.setQueryData<DashboardConfig[]>(
          ['dashboards'],
          previousDashboards.map(d => d.id === id ? { ...d, ...config } : d)
        );
      }

      return { previousDashboards };
    },
    onError: (error: Error, _variables, context) => {
      // Reverter atualização otimista
      if (context?.previousDashboards) {
        queryClient.setQueryData(['dashboards'], context.previousDashboards);
      }
      toast.error(`Erro ao atualizar dashboard: ${error.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      toast.success('Dashboard atualizado com sucesso!');
    },
  });

  // Deletar dashboard
  const deleteDashboard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dashboard_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['dashboards'] });

      const previousDashboards = queryClient.getQueryData<DashboardConfig[]>(['dashboards']);

      // Atualização otimista
      if (previousDashboards) {
        queryClient.setQueryData<DashboardConfig[]>(
          ['dashboards'],
          previousDashboards.filter(d => d.id !== id)
        );
      }

      return { previousDashboards };
    },
    onError: (error: Error, _id, context) => {
      if (context?.previousDashboards) {
        queryClient.setQueryData(['dashboards'], context.previousDashboards);
      }
      toast.error(`Erro ao deletar dashboard: ${error.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      toast.success('Dashboard deletado com sucesso!');
    },
  });

  return {
    dashboards: dashboards || [],
    isLoading,
    getDashboard,
    createDashboard: createDashboard.mutate,
    updateDashboard: updateDashboard.mutate,
    deleteDashboard: deleteDashboard.mutate,
    isCreating: createDashboard.isPending,
    isUpdating: updateDashboard.isPending,
    isDeleting: deleteDashboard.isPending,
  };
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AgentButtonShortcut {
  id: string;
  bitrix_telemarketing_id: number;
  button_config_id: string;
  hotkey: string | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface ButtonWithShortcut {
  id: string;
  label: string;
  color: string;
  field: string;
  hotkey: string | null;
  sort_order: number;
  is_visible: boolean;
  category: string | null;
}

export function useAgentButtonConfig(bitrixTelemarketingId: number | null) {
  const queryClient = useQueryClient();

  // Buscar configurações de atalhos do agente
  const { data: shortcuts, isLoading: loadingShortcuts } = useQuery({
    queryKey: ['agent-button-shortcuts', bitrixTelemarketingId],
    queryFn: async () => {
      if (!bitrixTelemarketingId) return [];
      
      const { data, error } = await supabase
        .from('agent_button_shortcuts')
        .select('*')
        .eq('bitrix_telemarketing_id', bitrixTelemarketingId);

      if (error) throw error;
      return data as AgentButtonShortcut[];
    },
    enabled: !!bitrixTelemarketingId,
  });

  // Buscar todos os botões e mesclar com atalhos do agente
  const { data: buttonsWithShortcuts, isLoading: loadingButtons } = useQuery({
    queryKey: ['buttons-with-shortcuts', bitrixTelemarketingId, shortcuts],
    queryFn: async () => {
      const { data: buttons, error } = await supabase
        .from('button_config')
        .select('id, label, color, field, hotkey, sort, category')
        .order('sort', { ascending: true });

      if (error) throw error;

      // Mesclar botões com atalhos do agente
      return buttons.map((button): ButtonWithShortcut => {
        const agentShortcut = shortcuts?.find(s => s.button_config_id === button.id);
        return {
          id: button.id,
          label: button.label,
          color: button.color,
          field: button.field,
          category: button.category,
          hotkey: agentShortcut?.hotkey ?? button.hotkey,
          sort_order: agentShortcut?.sort_order ?? button.sort ?? 0,
          is_visible: agentShortcut?.is_visible ?? true,
        };
      }).sort((a, b) => a.sort_order - b.sort_order);
    },
    enabled: !!bitrixTelemarketingId && shortcuts !== undefined,
  });

  // Salvar atalho individual
  const saveShortcut = useMutation({
    mutationFn: async (params: {
      buttonConfigId: string;
      hotkey?: string | null;
      sortOrder?: number;
      isVisible?: boolean;
    }) => {
      if (!bitrixTelemarketingId) throw new Error('ID do agente não encontrado');

      const { data: existing } = await supabase
        .from('agent_button_shortcuts')
        .select('id')
        .eq('bitrix_telemarketing_id', bitrixTelemarketingId)
        .eq('button_config_id', params.buttonConfigId)
        .single();

      if (existing) {
        // Atualizar existente
        const { error } = await supabase
          .from('agent_button_shortcuts')
          .update({
            hotkey: params.hotkey,
            sort_order: params.sortOrder,
            is_visible: params.isVisible,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Criar novo
        const { error } = await supabase
          .from('agent_button_shortcuts')
          .insert({
            bitrix_telemarketing_id: bitrixTelemarketingId,
            button_config_id: params.buttonConfigId,
            hotkey: params.hotkey,
            sort_order: params.sortOrder ?? 0,
            is_visible: params.isVisible ?? true,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-button-shortcuts', bitrixTelemarketingId] });
    },
    onError: (error) => {
      console.error('Erro ao salvar atalho:', error);
      toast.error('Erro ao salvar configuração');
    },
  });

  // Salvar ordem de múltiplos botões
  const saveButtonOrder = useMutation({
    mutationFn: async (orderedButtons: { buttonConfigId: string; sortOrder: number }[]) => {
      if (!bitrixTelemarketingId) throw new Error('ID do agente não encontrado');

      for (const item of orderedButtons) {
        const { data: existing } = await supabase
          .from('agent_button_shortcuts')
          .select('id')
          .eq('bitrix_telemarketing_id', bitrixTelemarketingId)
          .eq('button_config_id', item.buttonConfigId)
          .single();

        if (existing) {
          await supabase
            .from('agent_button_shortcuts')
            .update({ sort_order: item.sortOrder })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('agent_button_shortcuts')
            .insert({
              bitrix_telemarketing_id: bitrixTelemarketingId,
              button_config_id: item.buttonConfigId,
              sort_order: item.sortOrder,
            });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-button-shortcuts', bitrixTelemarketingId] });
      toast.success('Ordem dos botões salva');
    },
    onError: (error) => {
      console.error('Erro ao salvar ordem:', error);
      toast.error('Erro ao salvar ordem dos botões');
    },
  });

  // Resetar para configuração padrão
  const resetToDefault = useMutation({
    mutationFn: async () => {
      if (!bitrixTelemarketingId) throw new Error('ID do agente não encontrado');

      const { error } = await supabase
        .from('agent_button_shortcuts')
        .delete()
        .eq('bitrix_telemarketing_id', bitrixTelemarketingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-button-shortcuts', bitrixTelemarketingId] });
      toast.success('Configurações restauradas');
    },
    onError: (error) => {
      console.error('Erro ao resetar:', error);
      toast.error('Erro ao restaurar configurações');
    },
  });

  return {
    shortcuts,
    buttonsWithShortcuts,
    isLoading: loadingShortcuts || loadingButtons,
    saveShortcut: saveShortcut.mutate,
    saveButtonOrder: saveButtonOrder.mutate,
    resetToDefault: resetToDefault.mutate,
    isSaving: saveShortcut.isPending || saveButtonOrder.isPending,
  };
}

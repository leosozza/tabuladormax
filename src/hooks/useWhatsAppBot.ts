import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BotConfig {
  id: string;
  commercial_project_id: string;
  is_enabled: boolean;
  bot_name: string;
  personality: string;
  welcome_message: string;
  fallback_message: string;
  transfer_keywords: string[];
  operating_hours: {
    start: string;
    end: string;
    timezone: string;
    workDays: number[];
  };
  max_messages_before_transfer: number;
  response_delay_ms: number;
  collect_lead_data: boolean;
  auto_qualify: boolean;
  created_at: string;
  updated_at: string;
}

export interface BotConversation {
  id: string;
  commercial_project_id: string;
  phone_number: string;
  bitrix_id: string | null;
  conversation_id: number | null;
  status: 'active' | 'transferred' | 'completed' | 'abandoned';
  messages_count: number;
  bot_messages_count: number;
  started_at: string;
  ended_at: string | null;
  transferred_at: string | null;
  transferred_reason: string | null;
  satisfaction_score: number | null;
  resolved_by_bot: boolean;
  metadata: Record<string, unknown>;
}

export interface BotMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens_used: number | null;
  response_time_ms: number | null;
  confidence_score: number | null;
  created_at: string;
}

export interface BotStats {
  totalConversations: number;
  activeConversations: number;
  resolvedByBot: number;
  transferred: number;
  avgMessagesPerConversation: number;
  avgResponseTime: number;
  resolutionRate: number;
}

export const PERSONALITY_OPTIONS = [
  { value: 'formal', label: 'Formal', description: 'Profissional e direto', emoji: '👔' },
  { value: 'amigavel', label: 'Amigável', description: 'Próximo e acolhedor', emoji: '😊' },
  { value: 'consultivo', label: 'Consultivo', description: 'Especialista no assunto', emoji: '🎓' },
  { value: 'vendedor', label: 'Vendedor', description: 'Focado em conversão', emoji: '💼' },
] as const;

// Hook para buscar configuração do bot
export function useBotConfig(projectId?: string) {
  return useQuery({
    queryKey: ['bot-config', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      
      const { data, error } = await supabase
        .from('whatsapp_bot_config')
        .select('*')
        .eq('commercial_project_id', projectId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        operating_hours: data.operating_hours as BotConfig['operating_hours'],
      } as BotConfig;
    },
    enabled: !!projectId,
  });
}

// Hook para criar/atualizar configuração do bot
export function useUpsertBotConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Partial<BotConfig> & { commercial_project_id: string }) => {
      const { data, error } = await supabase
        .from('whatsapp_bot_config')
        .upsert(config, { onConflict: 'commercial_project_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bot-config', variables.commercial_project_id] });
      toast.success("Configuração do bot salva!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar configuração: ${error.message}`);
    },
  });
}

// Hook para ativar/desativar bot
export function useToggleBot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, enabled }: { projectId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('whatsapp_bot_config')
        .upsert({ 
          commercial_project_id: projectId, 
          is_enabled: enabled 
        }, { onConflict: 'commercial_project_id' });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bot-config', variables.projectId] });
      toast.success(variables.enabled ? "Bot ativado!" : "Bot desativado!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao alterar status do bot: ${error.message}`);
    },
  });
}

// Hook para buscar conversas do bot
export function useBotConversations(projectId?: string, status?: string) {
  return useQuery({
    queryKey: ['bot-conversations', projectId, status],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_bot_conversations')
        .select('*')
        .order('started_at', { ascending: false });

      if (projectId) {
        query = query.eq('commercial_project_id', projectId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return data as BotConversation[];
    },
    enabled: !!projectId,
  });
}

// Hook para buscar mensagens de uma conversa
export function useBotMessages(conversationId?: string) {
  return useQuery({
    queryKey: ['bot-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('whatsapp_bot_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as BotMessage[];
    },
    enabled: !!conversationId,
  });
}

// Hook para estatísticas do bot
export function useBotStats(projectId?: string) {
  return useQuery({
    queryKey: ['bot-stats', projectId],
    queryFn: async (): Promise<BotStats> => {
      if (!projectId) {
        return {
          totalConversations: 0,
          activeConversations: 0,
          resolvedByBot: 0,
          transferred: 0,
          avgMessagesPerConversation: 0,
          avgResponseTime: 0,
          resolutionRate: 0,
        };
      }

      const { data, error } = await supabase
        .from('whatsapp_bot_conversations')
        .select('*')
        .eq('commercial_project_id', projectId);

      if (error) throw error;

      const conversations = data || [];
      const total = conversations.length;
      const active = conversations.filter(c => c.status === 'active').length;
      const resolved = conversations.filter(c => c.resolved_by_bot).length;
      const transferred = conversations.filter(c => c.status === 'transferred').length;
      const totalMessages = conversations.reduce((sum, c) => sum + (c.messages_count || 0), 0);

      return {
        totalConversations: total,
        activeConversations: active,
        resolvedByBot: resolved,
        transferred: transferred,
        avgMessagesPerConversation: total > 0 ? Math.round(totalMessages / total) : 0,
        avgResponseTime: 0, // Calculado separadamente
        resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
      };
    },
    enabled: !!projectId,
  });
}

// Hook para testar o bot no playground
export function useTestBot() {
  return useMutation({
    mutationFn: async ({ 
      message, 
      projectId,
      conversationHistory 
    }: { 
      message: string; 
      projectId: string;
      conversationHistory?: Array<{ role: string; content: string }>;
    }) => {
      const { data, error } = await supabase.functions.invoke('whatsapp-bot-respond', {
        body: { 
          message, 
          project_id: projectId,
          conversation_history: conversationHistory,
          is_test: true
        }
      });

      if (error) throw error;
      return data;
    },
  });
}

// Hook para instruções de treinamento do bot por projeto
export function useBotTrainingInstructions(projectId?: string) {
  return useQuery({
    queryKey: ['bot-training', projectId],
    queryFn: async () => {
      let query = supabase
        .from('ai_training_instructions')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (projectId) {
        query = query.or(`commercial_project_id.eq.${projectId},commercial_project_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

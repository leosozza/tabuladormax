import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AIModel {
  id: string;
  name: string;
  description?: string;
}

export interface AIProvider {
  id: string;
  name: string;
  display_name: string;
  base_url: string;
  models: AIModel[];
  supports_tools: boolean;
  is_free: boolean;
  requires_api_key: boolean;
  default_model: string | null;
  is_active: boolean;
}

export interface AgentTool {
  id: string;
  commercial_project_id: string;
  name: string;
  display_name: string;
  description: string;
  tool_type: 'webhook' | 'bitrix_update' | 'bitrix_get' | 'supabase_query' | 'n8n_workflow' | 'send_template' | 'transfer_human';
  config: Record<string, unknown>;
  parameters_schema: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface ToolExecutionLog {
  id: string;
  conversation_id: string;
  tool_id: string;
  tool_name: string;
  input_params: Record<string, unknown>;
  output_result: Record<string, unknown>;
  status: 'pending' | 'success' | 'error';
  error_message?: string;
  execution_time_ms: number;
  created_at: string;
}

// Hook para buscar provedores de IA
export function useAIProviders() {
  return useQuery({
    queryKey: ['ai-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_providers')
        .select('*')
        .eq('is_active', true)
        .order('display_name');

      if (error) throw error;
      
      return (data || []).map(p => ({
        ...p,
        models: (p.models as unknown as AIModel[]) || [],
      })) as AIProvider[];
    },
  });
}

// Hook para buscar ferramentas do agente
export function useAgentTools(projectId?: string) {
  return useQuery({
    queryKey: ['agent-tools', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('bot_agent_tools')
        .select('*')
        .eq('commercial_project_id', projectId)
        .order('display_name');

      if (error) throw error;
      return data as AgentTool[];
    },
    enabled: !!projectId,
  });
}

// Hook para criar ferramenta do agente
export function useCreateAgentTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tool: Omit<AgentTool, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('bot_agent_tools')
        .insert({
          commercial_project_id: tool.commercial_project_id,
          name: tool.name,
          display_name: tool.display_name,
          description: tool.description,
          tool_type: tool.tool_type,
          config: tool.config as Record<string, string>,
          parameters_schema: tool.parameters_schema as Record<string, string>,
          is_active: tool.is_active,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agent-tools', variables.commercial_project_id] });
      toast.success("Ferramenta criada!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar ferramenta: ${error.message}`);
    },
  });
}

// Hook para atualizar ferramenta do agente
export function useUpdateAgentTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AgentTool> & { id: string }) => {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (updates.name) updateData.name = updates.name;
      if (updates.display_name) updateData.display_name = updates.display_name;
      if (updates.description) updateData.description = updates.description;
      if (updates.tool_type) updateData.tool_type = updates.tool_type;
      if (updates.config) updateData.config = updates.config as Record<string, string>;
      if (updates.parameters_schema) updateData.parameters_schema = updates.parameters_schema as Record<string, string>;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;

      const { data, error } = await supabase
        .from('bot_agent_tools')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agent-tools', data.commercial_project_id] });
      toast.success("Ferramenta atualizada!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar ferramenta: ${error.message}`);
    },
  });
}

// Hook para deletar ferramenta do agente
export function useDeleteAgentTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('bot_agent_tools')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agent-tools', data.projectId] });
      toast.success("Ferramenta removida!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover ferramenta: ${error.message}`);
    },
  });
}

// Hook para logs de execução de ferramentas
export function useToolExecutionLogs(conversationId?: string) {
  return useQuery({
    queryKey: ['tool-execution-logs', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from('bot_tool_execution_logs')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ToolExecutionLog[];
    },
    enabled: !!conversationId,
  });
}

// Templates de ferramentas pré-configuradas
export const TOOL_TEMPLATES = [
  {
    name: 'update_lead_status',
    display_name: 'Atualizar Status do Lead',
    description: 'Atualiza o status do lead no Bitrix quando o cliente demonstrar interesse ou desistir',
    tool_type: 'bitrix_update' as const,
    config: {
      webhook_url: 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/crm.lead.update.json',
      field: 'STATUS_ID',
    },
    parameters_schema: {
      type: 'object',
      properties: {
        value: {
          type: 'string',
          description: 'Novo status do lead',
          enum: ['NEW', 'IN_PROCESS', 'CONVERTED', 'JUNK'],
        },
      },
      required: ['value'],
    },
  },
  {
    name: 'get_lead_info',
    display_name: 'Buscar Informações do Lead',
    description: 'Busca informações detalhadas do lead no Bitrix',
    tool_type: 'bitrix_get' as const,
    config: {
      webhook_url: 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/crm.lead.get.json',
    },
    parameters_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'transfer_to_human',
    display_name: 'Transferir para Atendente',
    description: 'Transfere a conversa para um atendente humano quando necessário',
    tool_type: 'transfer_human' as const,
    config: {},
    parameters_schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Motivo da transferência',
        },
        message: {
          type: 'string',
          description: 'Mensagem a enviar antes de transferir',
        },
      },
      required: ['reason'],
    },
  },
  {
    name: 'custom_webhook',
    display_name: 'Webhook Personalizado',
    description: 'Chama um webhook externo com dados personalizados',
    tool_type: 'webhook' as const,
    config: {
      url: '',
      method: 'POST',
      headers: {},
    },
    parameters_schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          description: 'Dados a enviar para o webhook',
        },
      },
      required: [],
    },
  },
  {
    name: 'n8n_automation',
    display_name: 'Automação n8n',
    description: 'Executa um workflow n8n para automações complexas',
    tool_type: 'n8n_workflow' as const,
    config: {
      webhook_url: '',
    },
    parameters_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Ação a executar no workflow',
        },
        params: {
          type: 'object',
          description: 'Parâmetros adicionais',
        },
      },
      required: ['action'],
    },
  },
];

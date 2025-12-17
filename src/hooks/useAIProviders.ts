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
  tool_type: 'webhook' | 'bitrix_update' | 'bitrix_get' | 'bitrix_api' | 'supabase_query' | 'n8n_workflow' | 'send_template' | 'transfer_human';
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
  // ========== BITRIX API - Consultas e Ações ==========
  {
    name: 'verificar_disponibilidade',
    display_name: 'Verificar Disponibilidade',
    description: 'Verifica horários disponíveis na agenda do Bitrix para agendamento',
    tool_type: 'bitrix_api' as const,
    config: {
      method: 'calendar.accessibility.get',
      base_url: 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr',
    },
    parameters_schema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Data inicial (YYYY-MM-DD)' },
        to: { type: 'string', description: 'Data final (YYYY-MM-DD)' },
        users: { type: 'array', items: { type: 'number' }, description: 'IDs dos usuários' },
      },
      required: ['from', 'to'],
    },
  },
  {
    name: 'buscar_proximos_eventos',
    display_name: 'Buscar Próximos Eventos',
    description: 'Busca os próximos eventos/agendamentos da agenda',
    tool_type: 'bitrix_api' as const,
    config: {
      method: 'calendar.event.get.nearest',
      base_url: 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr',
      params: { type: 'user' },
    },
    parameters_schema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Quantidade de dias para buscar (padrão: 7)' },
        ownerId: { type: 'number', description: 'ID do responsável' },
      },
      required: [],
    },
  },
  {
    name: 'criar_agendamento',
    display_name: 'Criar Agendamento',
    description: 'Cria um novo evento/agendamento na agenda do Bitrix',
    tool_type: 'bitrix_api' as const,
    config: {
      method: 'calendar.event.add',
      base_url: 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr',
      params: { type: 'user' },
    },
    parameters_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Título do evento' },
        from: { type: 'string', description: 'Data/hora início (YYYY-MM-DD HH:mm:ss)' },
        to: { type: 'string', description: 'Data/hora fim (YYYY-MM-DD HH:mm:ss)' },
        description: { type: 'string', description: 'Descrição do evento' },
        ownerId: { type: 'number', description: 'ID do responsável' },
      },
      required: ['name', 'from', 'to'],
    },
  },
  {
    name: 'listar_produtos',
    display_name: 'Listar Produtos',
    description: 'Lista produtos disponíveis no catálogo do Bitrix',
    tool_type: 'bitrix_api' as const,
    config: {
      method: 'crm.product.list',
      base_url: 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr',
    },
    parameters_schema: {
      type: 'object',
      properties: {
        filter: { 
          type: 'object', 
          description: 'Filtros (ex: {ACTIVE: Y, SECTION_ID: 1})' 
        },
        select: {
          type: 'array',
          items: { type: 'string' },
          description: 'Campos a retornar (ex: [ID, NAME, PRICE])',
        },
      },
      required: [],
    },
  },
  {
    name: 'buscar_produto',
    display_name: 'Buscar Produto por Nome',
    description: 'Busca um produto específico pelo nome no Bitrix',
    tool_type: 'bitrix_api' as const,
    config: {
      method: 'crm.product.list',
      base_url: 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr',
    },
    parameters_schema: {
      type: 'object',
      properties: {
        nome: { type: 'string', description: 'Nome ou parte do nome do produto' },
      },
      required: ['nome'],
    },
  },
  {
    name: 'buscar_deal',
    display_name: 'Buscar Negócio/Deal',
    description: 'Busca informações de um negócio/deal no CRM',
    tool_type: 'bitrix_api' as const,
    config: {
      method: 'crm.deal.get',
      base_url: 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr',
    },
    parameters_schema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID do negócio' },
      },
      required: ['id'],
    },
  },
  {
    name: 'listar_atividades',
    display_name: 'Listar Atividades do Lead',
    description: 'Lista histórico de atividades e interações do lead',
    tool_type: 'bitrix_api' as const,
    config: {
      method: 'crm.activity.list',
      base_url: 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr',
    },
    parameters_schema: {
      type: 'object',
      properties: {
        OWNER_TYPE_ID: { type: 'number', description: 'Tipo (1=Lead, 2=Deal, 3=Contact)' },
        OWNER_ID: { type: 'number', description: 'ID do registro' },
      },
      required: [],
    },
  },
  {
    name: 'criar_atividade',
    display_name: 'Criar Atividade/Registro',
    description: 'Registra uma nova atividade ou interação no CRM',
    tool_type: 'bitrix_api' as const,
    config: {
      method: 'crm.activity.add',
      base_url: 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr',
    },
    parameters_schema: {
      type: 'object',
      properties: {
        SUBJECT: { type: 'string', description: 'Assunto da atividade' },
        DESCRIPTION: { type: 'string', description: 'Descrição detalhada' },
        TYPE_ID: { type: 'number', description: 'Tipo (1=Email, 2=Call, 6=Task)' },
        DIRECTION: { type: 'number', description: 'Direção (1=Entrada, 2=Saída)' },
        OWNER_TYPE_ID: { type: 'number', description: 'Tipo do dono (1=Lead)' },
        OWNER_ID: { type: 'number', description: 'ID do lead' },
      },
      required: ['SUBJECT', 'TYPE_ID'],
    },
  },
  {
    name: 'buscar_contato',
    display_name: 'Buscar Contato',
    description: 'Busca informações de um contato no CRM',
    tool_type: 'bitrix_api' as const,
    config: {
      method: 'crm.contact.get',
      base_url: 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr',
    },
    parameters_schema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID do contato' },
      },
      required: ['id'],
    },
  },
  {
    name: 'buscar_tarefas',
    display_name: 'Buscar Tarefas',
    description: 'Lista tarefas associadas a um lead ou usuário',
    tool_type: 'bitrix_api' as const,
    config: {
      method: 'tasks.task.list',
      base_url: 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr',
    },
    parameters_schema: {
      type: 'object',
      properties: {
        filter: { 
          type: 'object', 
          description: 'Filtros (ex: {STATUS: 2, RESPONSIBLE_ID: 1})' 
        },
      },
      required: [],
    },
  },
  // ========== FERRAMENTAS LEGADAS ==========
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

// Métodos Bitrix disponíveis para autocomplete
export const BITRIX_API_METHODS = [
  { value: 'calendar.accessibility.get', label: 'Verificar Disponibilidade', category: 'Calendário' },
  { value: 'calendar.event.get.nearest', label: 'Próximos Eventos', category: 'Calendário' },
  { value: 'calendar.event.add', label: 'Criar Evento', category: 'Calendário' },
  { value: 'calendar.event.update', label: 'Atualizar Evento', category: 'Calendário' },
  { value: 'calendar.event.delete', label: 'Deletar Evento', category: 'Calendário' },
  { value: 'calendar.resource.list', label: 'Listar Recursos', category: 'Calendário' },
  { value: 'crm.lead.get', label: 'Buscar Lead', category: 'CRM' },
  { value: 'crm.lead.list', label: 'Listar Leads', category: 'CRM' },
  { value: 'crm.lead.update', label: 'Atualizar Lead', category: 'CRM' },
  { value: 'crm.deal.get', label: 'Buscar Deal', category: 'CRM' },
  { value: 'crm.deal.list', label: 'Listar Deals', category: 'CRM' },
  { value: 'crm.contact.get', label: 'Buscar Contato', category: 'CRM' },
  { value: 'crm.contact.list', label: 'Listar Contatos', category: 'CRM' },
  { value: 'crm.product.get', label: 'Buscar Produto', category: 'CRM' },
  { value: 'crm.product.list', label: 'Listar Produtos', category: 'CRM' },
  { value: 'crm.activity.list', label: 'Listar Atividades', category: 'CRM' },
  { value: 'crm.activity.add', label: 'Criar Atividade', category: 'CRM' },
  { value: 'crm.activity.get', label: 'Buscar Atividade', category: 'CRM' },
  { value: 'tasks.task.list', label: 'Listar Tarefas', category: 'Tarefas' },
  { value: 'tasks.task.get', label: 'Buscar Tarefa', category: 'Tarefas' },
  { value: 'tasks.task.add', label: 'Criar Tarefa', category: 'Tarefas' },
  { value: 'user.get', label: 'Buscar Usuário', category: 'Usuários' },
  { value: 'user.current', label: 'Usuário Atual', category: 'Usuários' },
];

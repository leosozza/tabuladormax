// ============================================
// Flows Executor - Server-side Flow Execution
// ============================================
// Edge Function for executing flows with sequential step processing

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface FlowStep {
  id: string;
  type: 'tabular' | 'bitrix_connector' | 'supabase_connector' | 'supabase_query' | 'chatwoot_connector' | 'n8n_connector' | 'http_call' | 'wait' | 'bitrix_get_field' | 'gupshup_send_text' | 'gupshup_send_image' | 'gupshup_send_buttons' | 'gupshup_send_template' | 'condition' | 'assign_agent';
  nome: string;
  config: any;
}

interface ExecuteRequest {
  flowId: string;
  leadId?: number;
  phoneNumber?: string;
  bitrixId?: string;
  context?: Record<string, any>;
}

interface LogEntry {
  timestamp: string;
  stepId: string;
  stepNome: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  data?: any;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service_role key for server-side operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get authenticated user from authorization header
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido. Use POST.' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ExecuteRequest = await req.json();
    const { flowId, phoneNumber, bitrixId, context = {} } = body;
    
    // Support leadId directly or convert from bitrixId
    const leadId = body.leadId || (bitrixId ? parseInt(bitrixId) : undefined);
    
    // Propagate phoneNumber to context if provided
    if (phoneNumber && !context.phone_number) {
      context.phone_number = phoneNumber;
    }

    if (!flowId) {
      return new Response(
        JSON.stringify({ error: 'flowId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🚀 Iniciando execução de flow:', { flowId, leadId, userId });

    // Fetch flow from database
    const { data: flow, error: flowError } = await supabaseAdmin
      .from('flows')
      .select('*')
      .eq('id', flowId)
      .eq('ativo', true)
      .single();

    if (flowError || !flow) {
      console.error('Flow não encontrado:', flowError);
      return new Response(
        JSON.stringify({ error: 'Flow não encontrado ou inativo' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify flow has steps
    if (!flow.steps || !Array.isArray(flow.steps) || flow.steps.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Flow não possui steps definidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create flow run record
    const { data: flowRun, error: runError } = await supabaseAdmin
      .from('flows_runs')
      .insert([{
        flow_id: flowId,
        lead_id: leadId,
        status: 'running',
        logs: [],
        executed_by: userId
      }])
      .select()
      .single();

    if (runError || !flowRun) {
      console.error('Erro ao criar flow run:', runError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar execução do flow' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const runId = flowRun.id;
    const logs: LogEntry[] = [];

    const addLog = (stepId: string, stepNome: string, level: 'info' | 'success' | 'warning' | 'error', message: string, data?: any) => {
      logs.push({
        timestamp: new Date().toISOString(),
        stepId,
        stepNome,
        level,
        message,
        data
      });
    };

    addLog('flow', flow.nome, 'info', `Iniciando execução do flow: ${flow.nome}`);

    let finalStatus: 'completed' | 'failed' = 'completed';
    let resultado: any = { steps: [] };

    // Execute steps sequentially
    try {
      for (let i = 0; i < flow.steps.length; i++) {
        const step: FlowStep = flow.steps[i];
        
        addLog(step.id, step.nome, 'info', `Executando step ${i + 1}/${flow.steps.length}: ${step.nome}`);
        console.log(`📍 Executando step ${i + 1}: ${step.type} - ${step.nome}`);

        try {
          let stepResult: any = null;

          switch (step.type) {
            case 'tabular':
              stepResult = await executeTabularStep(step, leadId, { ...context, userId }, supabaseAdmin);
              break;
            
            case 'bitrix_connector':
              stepResult = await executeBitrixConnector(step, leadId, context);
              break;
            
            case 'supabase_connector':
              stepResult = await executeSupabaseConnector(step, leadId, supabaseAdmin);
              break;
            
            case 'chatwoot_connector':
              stepResult = await executeChatwootConnector(step, context);
              break;
            
            case 'n8n_connector':
              stepResult = await executeN8NConnector(step, leadId, context);
              break;
            
            case 'http_call':
              stepResult = await executeHttpCallStep(step, leadId, context);
              break;
            
            case 'wait':
              stepResult = await executeWaitStep(step);
              break;
            
            case 'bitrix_get_field':
              stepResult = await executeBitrixGetField(step, leadId, context, supabaseAdmin);
              break;
            
            case 'gupshup_send_text':
              stepResult = await executeGupshupSendText(step, leadId, context, supabaseAdmin, supabaseUrl, supabaseServiceKey);
              break;
            
            case 'gupshup_send_image':
              stepResult = await executeGupshupSendImage(step, leadId, context, supabaseAdmin, supabaseUrl, supabaseServiceKey);
              break;
            
            case 'gupshup_send_buttons':
              stepResult = await executeGupshupSendButtons(step, leadId, context, supabaseAdmin, supabaseUrl, supabaseServiceKey);
              break;
            
            case 'gupshup_send_template':
              stepResult = await executeGupshupSendTemplate(step, leadId, context, supabaseAdmin, supabaseUrl, supabaseServiceKey);
              break;
            
            case 'supabase_query':
              stepResult = await executeSupabaseQuery(step, leadId, context, supabaseAdmin);
              break;
            
            case 'condition':
              stepResult = await executeConditionStep(step, leadId, context);
              break;
            
            case 'assign_agent':
              stepResult = await executeAssignAgentStep(step, leadId, context, supabaseAdmin);
              break;
            
            default:
              throw new Error(`Tipo de step desconhecido: ${step.type}`);
          }

          addLog(step.id, step.nome, 'success', `Step completado com sucesso`, stepResult);
          resultado.steps.push({ stepId: step.id, success: true, result: stepResult });

          // Log to actions_log if leadId is provided
          if (leadId) {
            // Verificar se lead existe na tabela leads
            const { data: leadExists } = await supabaseAdmin
              .from('leads')
              .select('id')
              .eq('id', leadId)
              .maybeSingle();
            
            if (!leadExists) {
              console.warn(`⚠️ Lead ${leadId} não existe na tabela leads, pulando log de ação`);
              addLog(step.id, step.nome, 'warning', `Lead ${leadId} não sincronizado no banco local`);
            } else {
              await supabaseAdmin.from('actions_log').insert([{
                lead_id: leadId,
                action_label: `Flow: ${flow.nome} - ${step.nome}`,
                payload: { flowId, runId, stepId: step.id, result: stepResult },
                status: 'SUCCESS'
              }]);
            }
          }

        } catch (stepError) {
          const errorMessage = stepError instanceof Error ? stepError.message : String(stepError);
          addLog(step.id, step.nome, 'error', `Erro ao executar step: ${errorMessage}`, { error: errorMessage });
          console.error(`❌ Erro no step ${step.nome}:`, stepError);
          
          resultado.steps.push({ stepId: step.id, success: false, error: errorMessage });
          finalStatus = 'failed';

          // Log error to actions_log
          if (leadId) {
            // Verificar se lead existe antes de logar erro
            const { data: leadExists } = await supabaseAdmin
              .from('leads')
              .select('id')
              .eq('id', leadId)
              .maybeSingle();
            
            if (leadExists) {
              await supabaseAdmin.from('actions_log').insert([{
                lead_id: leadId,
                action_label: `Flow: ${flow.nome} - ${step.nome}`,
                payload: { flowId, runId, stepId: step.id, error: errorMessage },
                status: 'ERROR',
                error: errorMessage
              }]);
            }
          }

          // Stop execution on error
          break;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog('flow', flow.nome, 'error', `Erro fatal na execução: ${errorMessage}`);
      console.error('❌ Erro fatal:', error);
      finalStatus = 'failed';
      resultado.error = errorMessage;
    }

    // Update flow run with final status
    await supabaseAdmin
      .from('flows_runs')
      .update({
        status: finalStatus,
        logs: logs,
        resultado: resultado,
        completed_at: new Date().toISOString()
      })
      .eq('id', runId);

    addLog('flow', flow.nome, finalStatus === 'completed' ? 'success' : 'error', 
      `Execução finalizada com status: ${finalStatus}`);

    console.log('✅ Execução finalizada:', { runId, status: finalStatus });

    return new Response(
      JSON.stringify({
        runId,
        status: finalStatus,
        message: finalStatus === 'completed' ? 'Flow executado com sucesso' : 'Flow falhou durante execução',
        logs,
        resultado
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro no flows-executor:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to execute tabular step
async function executeTabularStep(step: FlowStep, leadId: number | undefined, context: Record<string, any>, supabaseAdmin: any) {
  if (!leadId) {
    throw new Error('leadId é obrigatório para steps do tipo tabular');
  }

  const config = step.config;
  const { webhook_url, field, value, additional_fields = [], transfer_conversation = false } = config;

  if (!webhook_url || !field) {
    throw new Error('webhook_url e field são obrigatórios para tabular steps');
  }

  console.log('🎯 Executando tabular step:', { leadId, field, value });

  // Build parameters for Bitrix
  const params = new URLSearchParams();
  params.append('ID', String(leadId));
  params.append(`FIELDS[${field}]`, value || '');

  // Add additional fields
  if (additional_fields && Array.isArray(additional_fields)) {
    additional_fields.forEach((addField: any) => {
      if (addField.field && addField.value) {
        params.append(`FIELDS[${addField.field}]`, addField.value);
      }
    });
  }

  const fullUrl = `${webhook_url}?${params.toString()}`;

  const response = await fetch(fullUrl, { method: 'GET' });
  const responseData = await response.json();

  if (responseData.error || !response.ok) {
    throw new Error(responseData.error_description || responseData.error || 'Erro ao atualizar Bitrix');
  }

  // Update Supabase leads table
  await supabaseAdmin
    .from('leads')
    .upsert({ id: leadId, [field]: value }, { onConflict: 'id' });

  // Transfer Chatwoot conversation if configured
  if (transfer_conversation) {
    try {
      // Get conversation_id from chatwoot_contacts
      const { data: contact } = await supabaseAdmin
        .from('chatwoot_contacts')
        .select('conversation_id')
        .eq('bitrix_id', String(leadId))
        .maybeSingle();

      if (contact?.conversation_id && context.userId) {
        console.log('🔄 Transferindo conversa do Chatwoot...', { 
          conversation_id: contact.conversation_id,
          operator_user_id: context.userId 
        });

        // Call chatwoot-transfer edge function
        const transferResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/chatwoot-transfer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({
            conversation_id: contact.conversation_id,
            operator_user_id: context.userId,
            lead_id: leadId
          })
        });

        if (transferResponse.ok) {
          const transferResult = await transferResponse.json();
          console.log('✅ Conversa transferida:', transferResult);
        } else {
          const errorText = await transferResponse.text();
          console.error('⚠️ Erro ao transferir conversa:', errorText);
        }
      } else {
        console.log('⚠️ Conversa não encontrada ou userId não fornecido');
      }
    } catch (transferError) {
      console.error('⚠️ Erro na transferência do Chatwoot:', transferError);
      // Não falhar a execução se a transferência falhar
    }
  }

  return { bitrixResponse: responseData, field, value, conversation_transferred: transfer_conversation };
}

// Helper function to execute HTTP call step
async function executeHttpCallStep(step: FlowStep, leadId: number | undefined, context: Record<string, any>) {
  const config = step.config;
  const { url, method = 'GET', headers = {}, body } = config;

  if (!url) {
    throw new Error('url é obrigatório para http_call steps');
  }

  console.log('🌐 Executando HTTP call:', { url, method });

  // Replace placeholders in URL and body
  const processedUrl = replacePlaceholders(url, leadId, context);
  const processedBody = body ? replacePlaceholders(body, leadId, context) : undefined;

  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (processedBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
    fetchOptions.body = JSON.stringify(processedBody);
  }

  const response = await fetch(processedUrl, fetchOptions);
  let responseData: any;

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    responseData = await response.json();
  } else {
    responseData = await response.text();
  }

  if (!response.ok) {
    throw new Error(`HTTP ${method} failed with status ${response.status}: ${JSON.stringify(responseData)}`);
  }

  return { status: response.status, data: responseData };
}

// Helper function to execute wait step
async function executeWaitStep(step: FlowStep) {
  const config = step.config;
  const { seconds = 1 } = config;

  console.log(`⏳ Aguardando ${seconds} segundos...`);
  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
  
  return { waited: seconds };
}

// Bitrix Connector
async function executeBitrixConnector(step: FlowStep, leadId: number | undefined, context: Record<string, any>) {
  if (!leadId) throw new Error('leadId obrigatório');
  
  const { webhook_url, field, value, additional_fields = [] } = step.config;
  const params = new URLSearchParams();
  params.append('ID', String(leadId));
  params.append(`FIELDS[${field}]`, value || '');
  
  additional_fields.forEach((f: any) => {
    params.append(`FIELDS[${f.field}]`, f.value);
  });
  
  const response = await fetch(`${webhook_url}?${params.toString()}`);
  return await response.json();
}

// Supabase Connector
async function executeSupabaseConnector(step: FlowStep, leadId: number | undefined, supabaseAdmin: any) {
  const { action, table, filters, data } = step.config;
  
  if (action === 'update') {
    const { error } = await supabaseAdmin.from(table).update(data).match(filters);
    if (error) throw error;
  }
  
  return { action, table };
}

// Chatwoot Connector
async function executeChatwootConnector(step: FlowStep, context: Record<string, any>) {
  const { action, conversation_id } = step.config;
  console.log('💬 Chatwoot action:', { action, conversation_id });
  return { action, conversation_id };
}

// N8N Connector - supports both webhook and MCP modes
async function executeN8NConnector(step: FlowStep, leadId: number | undefined, context: Record<string, any>) {
  const config = step.config;
  const mode = config.mode || 'webhook';

  console.log('🔌 N8N Connector:', { mode, workflowId: config.workflow_id, webhookUrl: config.webhook_url });

  if (mode === 'mcp' && config.workflow_id) {
    // Execute via MCP
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Prepare inputs with leadId and context
    const workflowInputs = {
      leadId,
      ...context,
      ...(config.workflow_inputs || {})
    };

    console.log('🎯 Executing n8n workflow via MCP:', { 
      workflowId: config.workflow_id, 
      workflowName: config.workflow_name,
      inputs: workflowInputs 
    });

    // Call the n8n-mcp-proxy edge function
    const response = await fetch(`${supabaseUrl}/functions/v1/n8n-mcp-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        action: 'execute-workflow',
        workflowId: config.workflow_id,
        inputs: workflowInputs
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MCP workflow execution failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return { 
      mode: 'mcp', 
      workflowId: config.workflow_id, 
      workflowName: config.workflow_name,
      result: result.result 
    };

  } else {
    // Execute via webhook (legacy mode)
    const { webhook_url, method, payload } = config;
    
    if (!webhook_url) {
      throw new Error('webhook_url é obrigatório para n8n_connector em modo webhook');
    }

    const response = await fetch(webhook_url, {
      method: method || 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: (method || 'POST') === 'POST' ? JSON.stringify({ leadId, ...payload }) : undefined
    });
    
    const responseData = await response.json();
    return { mode: 'webhook', webhookUrl: webhook_url, result: responseData };
  }
}

// Helper to replace placeholders
function replacePlaceholders(value: any, leadId: number | undefined, context: Record<string, any>): any {
  if (typeof value === 'string') {
    let result = value;
    if (leadId !== undefined) {
      result = result.replace(/\{\{lead_id\}\}/g, String(leadId));
    }
    Object.entries(context).forEach(([key, val]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, String(val));
    });
    return result;
  } else if (Array.isArray(value)) {
    return value.map(item => replacePlaceholders(item, leadId, context));
  } else if (typeof value === 'object' && value !== null) {
    const result: Record<string, any> = {};
    Object.entries(value).forEach(([key, val]) => {
      result[key] = replacePlaceholders(val, leadId, context);
    });
    return result;
  }
  return value;
}

// ============================================
// NOVOS STEP TYPES: Gupshup + Bitrix
// ============================================

// Bitrix Get Field - Busca campo do lead
async function executeBitrixGetField(
  step: FlowStep, 
  leadId: number | undefined, 
  context: Record<string, any>,
  supabaseAdmin: any
) {
  if (!leadId) throw new Error('leadId é obrigatório para bitrix_get_field');
  
  const { bitrix_field, output_variable } = step.config;
  
  if (!bitrix_field || !output_variable) {
    throw new Error('bitrix_field e output_variable são obrigatórios');
  }
  
  console.log(`📥 Buscando campo ${bitrix_field} do lead ${leadId}...`);
  
  // Buscar lead no Supabase
  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .select('raw')
    .eq('id', leadId)
    .single();
  
  if (error || !lead) {
    throw new Error(`Lead ${leadId} não encontrado: ${error?.message || 'não existe'}`);
  }
  
  // Extrair valor do campo do raw JSON
  const fieldValue = lead.raw?.[bitrix_field];
  
  if (!fieldValue) {
    console.warn(`⚠️ Campo ${bitrix_field} está vazio ou não existe no lead ${leadId}`);
  }
  
  // Salvar no contexto para uso em steps seguintes
  context[output_variable] = fieldValue || '';
  
  console.log(`✅ Campo ${bitrix_field} = "${fieldValue}" salvo em {{${output_variable}}}`);
  
  return { 
    field: bitrix_field, 
    value: fieldValue,
    output_variable,
    lead_id: leadId 
  };
}

// Gupshup Send Text - Envia texto via WhatsApp
async function executeGupshupSendText(
  step: FlowStep,
  leadId: number | undefined,
  context: Record<string, any>,
  supabaseAdmin: any,
  supabaseUrl: string,
  supabaseServiceKey: string
) {
  const { message, phone_number } = step.config;
  
  if (!message) {
    throw new Error('message é obrigatório para gupshup_send_text');
  }
  
  // Resolver placeholders no texto
  const resolvedMessage = replacePlaceholders(message, leadId, context);
  
  // Obter telefone do lead se não informado
  let targetPhone = phone_number;
  if (!targetPhone && leadId) {
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('celular, telefone_casa, phone_normalized')
      .eq('id', leadId)
      .single();
    
    targetPhone = lead?.phone_normalized || lead?.celular || lead?.telefone_casa;
  }
  
  // Também pode vir do contexto
  if (!targetPhone && context.phone_number) {
    targetPhone = context.phone_number;
  }
  
  if (!targetPhone) {
    throw new Error('Não foi possível determinar o telefone do destinatário');
  }
  
  console.log(`📤 Enviando texto para ${targetPhone}: "${resolvedMessage.substring(0, 50)}..."`);
  
  // Chamar gupshup-send-message internamente
  const response = await fetch(`${supabaseUrl}/functions/v1/gupshup-send-message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`
    },
    body: JSON.stringify({
      action: 'send_message',
      phone_number: targetPhone,
      message: resolvedMessage,
      bitrix_id: leadId?.toString(),
      source: 'flow_executor'
    })
  });
  
  const result = await response.json();
  
  if (!response.ok || result.error) {
    throw new Error(result.error || `Erro ao enviar mensagem: ${response.status}`);
  }
  
  console.log(`✅ Mensagem enviada: ${result.messageId}`);
  
  return {
    messageId: result.messageId,
    phone: targetPhone,
    message: resolvedMessage.substring(0, 100)
  };
}

// Gupshup Send Image - Envia imagem via WhatsApp
async function executeGupshupSendImage(
  step: FlowStep,
  leadId: number | undefined,
  context: Record<string, any>,
  supabaseAdmin: any,
  supabaseUrl: string,
  supabaseServiceKey: string
) {
  const { image_url, caption, phone_number } = step.config;
  
  if (!image_url) {
    throw new Error('image_url é obrigatório para gupshup_send_image');
  }
  
  // Resolver placeholders
  const resolvedUrl = replacePlaceholders(image_url, leadId, context);
  const resolvedCaption = caption ? replacePlaceholders(caption, leadId, context) : '';
  
  // Obter telefone
  let targetPhone = phone_number;
  if (!targetPhone && leadId) {
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('celular, telefone_casa, phone_normalized')
      .eq('id', leadId)
      .single();
    
    targetPhone = lead?.phone_normalized || lead?.celular || lead?.telefone_casa;
  }
  
  if (!targetPhone && context.phone_number) {
    targetPhone = context.phone_number;
  }
  
  if (!targetPhone) {
    throw new Error('Não foi possível determinar o telefone do destinatário');
  }
  
  console.log(`📤 Enviando imagem para ${targetPhone}: ${resolvedUrl.substring(0, 50)}...`);
  
  // Chamar gupshup-send-message com action send_media
  const response = await fetch(`${supabaseUrl}/functions/v1/gupshup-send-message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`
    },
    body: JSON.stringify({
      action: 'send_media',
      phone_number: targetPhone,
      media_type: 'image',
      media_url: resolvedUrl,
      caption: resolvedCaption,
      bitrix_id: leadId?.toString(),
      source: 'flow_executor'
    })
  });
  
  const result = await response.json();
  
  if (!response.ok || result.error) {
    throw new Error(result.error || `Erro ao enviar imagem: ${response.status}`);
  }
  
  console.log(`✅ Imagem enviada: ${result.messageId}`);
  
  return {
    messageId: result.messageId,
    phone: targetPhone,
    image_url: resolvedUrl.substring(0, 100),
    caption: resolvedCaption.substring(0, 50)
  };
}

// Gupshup Send Buttons - Envia mensagem com botões Quick Reply
async function executeGupshupSendButtons(
  step: FlowStep,
  leadId: number | undefined,
  context: Record<string, any>,
  supabaseAdmin: any,
  supabaseUrl: string,
  supabaseServiceKey: string
) {
  const { message, buttons, phone_number, header, footer } = step.config;
  
  if (!message || !buttons || !Array.isArray(buttons) || buttons.length === 0) {
    throw new Error('message e buttons são obrigatórios para gupshup_send_buttons');
  }
  
  // Resolver placeholders
  const resolvedMessage = replacePlaceholders(message, leadId, context);
  const resolvedHeader = header ? replacePlaceholders(header, leadId, context) : undefined;
  const resolvedFooter = footer ? replacePlaceholders(footer, leadId, context) : undefined;
  
  // Obter telefone
  let targetPhone = phone_number;
  if (!targetPhone && leadId) {
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('celular, telefone_casa, phone_normalized')
      .eq('id', leadId)
      .single();
    
    targetPhone = lead?.phone_normalized || lead?.celular || lead?.telefone_casa;
  }
  
  if (!targetPhone && context.phone_number) {
    targetPhone = context.phone_number;
  }
  
  if (!targetPhone) {
    throw new Error('Não foi possível determinar o telefone do destinatário');
  }
  
  console.log(`📤 Enviando mensagem com ${buttons.length} botões para ${targetPhone}`);
  
  // Chamar gupshup-send-message com action send_interactive
  const response = await fetch(`${supabaseUrl}/functions/v1/gupshup-send-message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`
    },
    body: JSON.stringify({
      action: 'send_interactive',
      phone_number: targetPhone,
      message_text: resolvedMessage,
      buttons: buttons.map((btn: any, index: number) => ({
        id: btn.id || `btn_${index}`,
        title: btn.title || btn.text || `Opção ${index + 1}`
      })),
      header: resolvedHeader,
      footer: resolvedFooter,
      bitrix_id: leadId?.toString(),
      source: 'flow_executor'
    })
  });
  
  const result = await response.json();
  
  if (!response.ok || result.error) {
    throw new Error(result.error || `Erro ao enviar botões: ${response.status}`);
  }
  
  console.log(`✅ Mensagem com botões enviada: ${result.messageId}`);
  
  return {
    messageId: result.messageId,
    phone: targetPhone,
    message: resolvedMessage.substring(0, 100),
    buttons: buttons.map((b: any) => b.title || b.text)
  };
}

// Gupshup Send Template - Envia template HSM via WhatsApp
async function executeGupshupSendTemplate(
  step: FlowStep,
  leadId: number | undefined,
  context: Record<string, any>,
  supabaseAdmin: any,
  supabaseUrl: string,
  supabaseServiceKey: string
) {
  const { template_id, variables = [], buttons = [], wait_for_response, phone_number } = step.config;
  
  if (!template_id) {
    throw new Error('template_id é obrigatório para gupshup_send_template');
  }
  
  // Obter telefone
  let targetPhone = phone_number;
  if (!targetPhone && leadId) {
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('celular, telefone_casa, phone_normalized')
      .eq('id', leadId)
      .single();
    
    targetPhone = lead?.phone_normalized || lead?.celular || lead?.telefone_casa;
  }
  
  if (!targetPhone && context.phone_number) {
    targetPhone = context.phone_number;
  }
  
  if (!targetPhone) {
    throw new Error('Não foi possível determinar o telefone do destinatário');
  }
  
  // Resolver variáveis do template
  const resolvedVariables = variables.map((v: { index: number; value: string }) => {
    const resolved = replacePlaceholders(v.value || '', leadId, context);
    return resolved;
  });
  
  console.log(`📤 Enviando template ${template_id} para ${targetPhone} com ${resolvedVariables.length} variáveis`);
  
  // Chamar gupshup-send-message com action send_template
  const response = await fetch(`${supabaseUrl}/functions/v1/gupshup-send-message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`
    },
    body: JSON.stringify({
      action: 'send_template',
      phone_number: targetPhone,
      template_id: template_id,
      variables: resolvedVariables,
      bitrix_id: leadId?.toString(),
      source: 'flow_executor'
    })
  });
  
  const result = await response.json();
  
  if (!response.ok || result.error) {
    throw new Error(result.error || `Erro ao enviar template: ${response.status}`);
  }
  
  console.log(`✅ Template enviado: ${result.messageId}`);
  
  return {
    messageId: result.messageId,
    phone: targetPhone,
    template_id,
    variables: resolvedVariables,
    buttons: buttons.map((b: any) => b.text),
    waiting_for_response: wait_for_response
  };
}

// Supabase Query - Consulta dados do banco
async function executeSupabaseQuery(
  step: FlowStep,
  leadId: number | undefined,
  context: Record<string, any>,
  supabaseAdmin: any
) {
  const { table, select, filter_field, filter_value, output_variable } = step.config;
  
  if (!table || !select) {
    throw new Error('table e select são obrigatórios para supabase_query');
  }
  
  // Resolver variáveis no filter_value (ex: {{phone_number}})
  let resolvedFilterValue = filter_value;
  if (filter_value && typeof filter_value === 'string' && filter_value.includes('{{')) {
    const varName = filter_value.replace(/\{\{|\}\}/g, '').trim();
    resolvedFilterValue = context[varName] || filter_value;
  }
  
  console.log(`🔍 Supabase Query: SELECT ${select} FROM ${table} WHERE ${filter_field} = ${resolvedFilterValue}`);
  
  // Construir query
  let query = supabaseAdmin.from(table).select(select);
  
  if (filter_field && resolvedFilterValue) {
    query = query.eq(filter_field, resolvedFilterValue);
  }
  
  const { data, error } = await query.maybeSingle();
  
  if (error) {
    throw new Error(`Erro na query: ${error.message}`);
  }
  
  console.log(`📊 Resultado da query:`, data);
  
  // Salvar resultado no contexto para steps seguintes
  if (output_variable && data) {
    // Se select é um único campo, pegar o valor direto
    if (!select.includes(',') && data[select] !== undefined) {
      context[output_variable] = data[select];
      console.log(`💾 Variável ${output_variable} = ${data[select]}`);
    } else {
      // Se múltiplos campos, salvar o objeto inteiro
      context[output_variable] = data;
      console.log(`💾 Variável ${output_variable} =`, data);
    }
  }
  
  return {
    table,
    select,
    filter_field,
    filter_value: resolvedFilterValue,
    data,
    output_variable: output_variable ? { [output_variable]: context[output_variable] } : null
  };
}

// Condition Step - Avalia condições e retorna resultado
async function executeConditionStep(step: FlowStep, leadId: number | undefined, context: Record<string, any>) {
  const { conditions, logic = 'AND' } = step.config;
  
  if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
    console.log('🔍 Condição sem regras definidas, continuando...');
    return { matched: true, reason: 'Sem condições definidas' };
  }
  
  const results = conditions.map((cond: any) => {
    const variable = replacePlaceholders(cond.variable || '', leadId, context);
    const value = cond.value || '';
    const operator = cond.operator || 'equals';
    
    let result = false;
    switch (operator) {
      case 'equals':
        result = variable === value;
        break;
      case 'not_equals':
        result = variable !== value;
        break;
      case 'contains':
        result = String(variable).includes(value);
        break;
      case 'starts_with':
        result = String(variable).startsWith(value);
        break;
      case 'ends_with':
        result = String(variable).endsWith(value);
        break;
      case 'is_empty':
        result = !variable || variable === '';
        break;
      case 'is_not_empty':
        result = !!variable && variable !== '';
        break;
      default:
        result = false;
    }
    
    console.log(`  📌 ${cond.variable} ${operator} "${value}" => ${result} (valor atual: "${variable}")`);
    return { condition: cond, result };
  });
  
  const matched = logic === 'AND' 
    ? results.every(r => r.result) 
    : results.some(r => r.result);
  
  console.log(`🔍 Condição avaliada [${logic}]: ${matched}`);
  
  return { matched, logic, results };
}

// Assign Agent Step - Marca conversa para atendimento humano
async function executeAssignAgentStep(step: FlowStep, leadId: number | undefined, context: Record<string, any>, supabaseAdmin: any) {
  const { agentId, message } = step.config;
  
  const phoneNumber = context.phone_number;
  
  if (!phoneNumber) {
    console.log('⚠️ phone_number não disponível no contexto');
    return { assigned: false, reason: 'phone_number não disponível' };
  }
  
  // Buscar conversa mais recente pelo telefone
  const { data: conversation } = await supabaseAdmin
    .from('whatsapp_conversations')
    .select('id, status')
    .eq('phone_number', phoneNumber)
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (!conversation) {
    console.log(`⚠️ Conversa não encontrada para ${phoneNumber}`);
    return { assigned: false, reason: 'Conversa não encontrada' };
  }
  
  // Atualizar status da conversa para pendente de atendimento
  const { error } = await supabaseAdmin
    .from('whatsapp_conversations')
    .update({ 
      needs_attention: true,
      status: 'pending_agent',
      updated_at: new Date().toISOString()
    })
    .eq('id', conversation.id);
  
  if (error) {
    console.error('❌ Erro ao atualizar conversa:', error);
    throw new Error(`Erro ao marcar conversa: ${error.message}`);
  }
  
  console.log(`👤 Conversa ${conversation.id} marcada para atendimento humano`);
  
  return { 
    assigned: true, 
    conversationId: conversation.id,
    phoneNumber,
    agentId: agentId === 'auto' ? 'auto-assigned' : agentId,
    message: message || 'Conversa encaminhada para atendimento'
  };
}

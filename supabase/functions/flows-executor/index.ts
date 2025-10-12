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
  type: 'tabular' | 'http_call' | 'wait';
  nome: string;
  config: any;
}

interface ExecuteRequest {
  flowId: string;
  leadId?: number;
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
    const { flowId, leadId, context = {} } = body;

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
        executado_por: userId
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
              stepResult = await executeTabularStep(step, leadId, context, supabaseAdmin);
              break;
            
            case 'http_call':
              stepResult = await executeHttpCallStep(step, leadId, context);
              break;
            
            case 'wait':
              stepResult = await executeWaitStep(step);
              break;
            
            default:
              throw new Error(`Tipo de step desconhecido: ${step.type}`);
          }

          addLog(step.id, step.nome, 'success', `Step completado com sucesso`, stepResult);
          resultado.steps.push({ stepId: step.id, success: true, result: stepResult });

          // Log to actions_log if leadId is provided
          if (leadId) {
            await supabaseAdmin.from('actions_log').insert([{
              lead_id: leadId,
              action_label: `Flow: ${flow.nome} - ${step.nome}`,
              user_id: userId || null,
              payload: { flowId, runId, stepId: step.id, result: stepResult },
              status: 'SUCCESS'
            }]);
          }

        } catch (stepError) {
          const errorMessage = stepError instanceof Error ? stepError.message : String(stepError);
          addLog(step.id, step.nome, 'error', `Erro ao executar step: ${errorMessage}`, { error: errorMessage });
          console.error(`❌ Erro no step ${step.nome}:`, stepError);
          
          resultado.steps.push({ stepId: step.id, success: false, error: errorMessage });
          finalStatus = 'failed';

          // Log error to actions_log
          if (leadId) {
            await supabaseAdmin.from('actions_log').insert([{
              lead_id: leadId,
              action_label: `Flow: ${flow.nome} - ${step.nome}`,
              user_id: userId || null,
              payload: { flowId, runId, stepId: step.id, error: errorMessage },
              status: 'ERROR',
              error: errorMessage
            }]);
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
        finalizado_em: new Date().toISOString()
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
  const { webhook_url, field, value, additional_fields = [] } = config;

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

  return { bitrixResponse: responseData, field, value };
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

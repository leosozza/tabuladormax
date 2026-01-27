// ============================================
// Flows Scheduler - Processes scheduled flow actions
// ============================================
// Edge Function that runs via cron to execute pending scheduled actions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('⏰ flows-scheduler: Verificando ações agendadas...');

    // Fetch pending scheduled actions that are due
    const { data: pendingActions, error: fetchError } = await supabaseAdmin
      .from('flow_scheduled_actions')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(50); // Process in batches

    if (fetchError) {
      console.error('❌ Erro ao buscar ações agendadas:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingActions || pendingActions.length === 0) {
      console.log('✅ Nenhuma ação agendada pendente');
      return new Response(
        JSON.stringify({ message: 'Nenhuma ação pendente', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Encontradas ${pendingActions.length} ações pendentes`);

    const results: any[] = [];

    for (const action of pendingActions) {
      console.log(`🚀 Processando ação ${action.id}...`);
      
      try {
        // Determine which flow to execute
        const targetFlowId = action.target_flow_id || action.flow_id;
        
        if (!targetFlowId) {
          throw new Error('Nenhum flow_id disponível para execução');
        }

        // Prepare context from stored context
        const context = action.context || {};
        
        // Call flows-executor to run the flow
        const executorResponse = await fetch(`${supabaseUrl}/functions/v1/flows-executor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            flowId: targetFlowId,
            leadId: action.lead_id,
            phoneNumber: action.phone_number,
            context: {
              ...context,
              scheduled_action_id: action.id,
              scheduled_for: action.scheduled_for,
              is_scheduled_execution: true
            },
            // If target_step_id is specified, start from that step
            startFromStepId: action.target_step_id || null
          })
        });

        const executorResult = await executorResponse.json();

        if (!executorResponse.ok) {
          throw new Error(executorResult.error || 'Erro ao executar flow');
        }

        // Update action as executed
        await supabaseAdmin
          .from('flow_scheduled_actions')
          .update({
            status: 'executed',
            executed_at: new Date().toISOString()
          })
          .eq('id', action.id);

        console.log(`✅ Ação ${action.id} executada com sucesso`);
        
        results.push({
          id: action.id,
          success: true,
          result: executorResult
        });

      } catch (actionError) {
        const errorMessage = actionError instanceof Error ? actionError.message : String(actionError);
        console.error(`❌ Erro na ação ${action.id}:`, errorMessage);

        // Update action as failed
        await supabaseAdmin
          .from('flow_scheduled_actions')
          .update({
            status: 'failed',
            executed_at: new Date().toISOString(),
            error_message: errorMessage
          })
          .eq('id', action.id);

        results.push({
          id: action.id,
          success: false,
          error: errorMessage
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`📊 Processamento concluído: ${successCount} sucesso, ${failCount} falhas`);

    return new Response(
      JSON.stringify({
        message: 'Processamento concluído',
        processed: results.length,
        success: successCount,
        failed: failCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro no flows-scheduler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

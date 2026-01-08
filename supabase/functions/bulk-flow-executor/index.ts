// ============================================
// Bulk Flow Executor - Execução de Flow em Lote
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface BulkExecuteRequest {
  flowId: string;
  leadIds: number[];
  delayMs?: number; // Delay entre cada execução (default: 500ms)
}

interface LeadResult {
  leadId: number;
  success: boolean;
  runId?: string;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get authenticated user
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) userId = user.id;
    }

    const body: BulkExecuteRequest = await req.json();
    const { flowId, leadIds, delayMs = 500 } = body;

    if (!flowId) {
      return new Response(
        JSON.stringify({ error: 'flowId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'leadIds é obrigatório e deve ser um array não vazio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limitar a 100 leads por request para evitar timeout
    if (leadIds.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Máximo de 100 leads por request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se o flow existe e está ativo
    const { data: flow, error: flowError } = await supabaseAdmin
      .from('flows')
      .select('id, nome')
      .eq('id', flowId)
      .eq('ativo', true)
      .single();

    if (flowError || !flow) {
      return new Response(
        JSON.stringify({ error: 'Flow não encontrado ou inativo' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🚀 Iniciando execução em lote: Flow "${flow.nome}" para ${leadIds.length} leads`);

    const results: LeadResult[] = [];
    let successCount = 0;
    let failCount = 0;

    // Executar para cada lead sequencialmente com delay
    for (let i = 0; i < leadIds.length; i++) {
      const leadId = leadIds[i];
      
      try {
        console.log(`📍 Executando lead ${i + 1}/${leadIds.length}: ${leadId}`);

        // Chamar flows-executor para este lead
        const response = await fetch(`${supabaseUrl}/functions/v1/flows-executor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            flowId,
            leadId,
            context: { userId, bulkExecution: true }
          }),
        });

        const result = await response.json();

        if (response.ok && result.status === 'completed') {
          results.push({ leadId, success: true, runId: result.runId });
          successCount++;
        } else {
          results.push({ 
            leadId, 
            success: false, 
            error: result.error || result.message || 'Erro desconhecido' 
          });
          failCount++;
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error(`❌ Erro no lead ${leadId}:`, errorMsg);
        results.push({ leadId, success: false, error: errorMsg });
        failCount++;
      }

      // Delay entre execuções (exceto no último)
      if (i < leadIds.length - 1 && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    console.log(`✅ Execução em lote finalizada: ${successCount} sucesso, ${failCount} falha`);

    // Registrar log do envio em lote
    await supabaseAdmin.from('bulk_message_logs').insert([{
      user_id: userId,
      template_id: flowId, // Reusing this field for flow_id
      total_sent: successCount,
      total_failed: failCount,
      results: { 
        flow_name: flow.nome,
        lead_results: results 
      },
      completed_at: new Date().toISOString(),
    }]);

    return new Response(
      JSON.stringify({
        message: `Execução em lote finalizada`,
        flowId,
        flowName: flow.nome,
        total: leadIds.length,
        success: successCount,
        failed: failCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro no bulk-flow-executor:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================
// Flows Resume - Retoma fluxos pausados após resposta de botão
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ResumeRequest {
  phoneNumber: string;
  buttonText: string;
  buttonId?: string;
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

    const body: ResumeRequest = await req.json();
    const { phoneNumber, buttonText, buttonId } = body;

    if (!phoneNumber || !buttonText) {
      return new Response(
        JSON.stringify({ error: 'phoneNumber e buttonText são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalizar telefone
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    console.log(`🔍 Buscando fluxo pendente para ${normalizedPhone}, botão: "${buttonText}"`);

    // Buscar fluxo pendente para este telefone
    const { data: pendingResponse, error: fetchError } = await supabaseAdmin
      .from('flow_pending_responses')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('❌ Erro ao buscar fluxo pendente:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar fluxo pendente' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingResponse) {
      console.log(`⚠️ Nenhum fluxo pendente encontrado para ${normalizedPhone}`);
      return new Response(
        JSON.stringify({ resumed: false, reason: 'Nenhum fluxo pendente para este número' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Fluxo pendente encontrado: run_id=${pendingResponse.run_id}, step_id=${pendingResponse.step_id}`);

    // Encontrar qual botão foi clicado
    const buttons = pendingResponse.buttons || [];
    let matchedButton = null;
    let matchedIndex = -1;

    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      // Match por texto exato ou por ID
      if (btn.text?.toLowerCase() === buttonText.toLowerCase() || 
          btn.id === buttonId ||
          btn.text?.toLowerCase().includes(buttonText.toLowerCase())) {
        matchedButton = btn;
        matchedIndex = i;
        break;
      }
    }

    console.log(`🔘 Botão "${buttonText}" → matched: ${matchedButton ? matchedButton.text : 'NÃO'}, nextStepId: ${matchedButton?.nextStepId || 'nenhum'}`);

    // Atualizar o registro como respondido
    await supabaseAdmin
      .from('flow_pending_responses')
      .update({
        status: 'responded',
        responded_at: new Date().toISOString(),
        response_button_id: matchedButton?.id || buttonId || `unknown_${matchedIndex}`
      })
      .eq('id', pendingResponse.id);

    // Se o botão tem um nextStepId configurado, executar o branch específico
    if (matchedButton?.nextStepId) {
      console.log(`🔀 Executando branch do botão: ${matchedButton.nextStepId}`);
      
      // Buscar o flow para encontrar o step alvo
      const { data: flow } = await supabaseAdmin
        .from('flows')
        .select('steps')
        .eq('id', pendingResponse.flow_id)
        .single();

      if (flow?.steps) {
        // Encontrar o índice do step alvo
        const targetStepIndex = flow.steps.findIndex((s: any) => s.id === matchedButton.nextStepId);
        
        if (targetStepIndex >= 0) {
          // Preparar contexto atualizado com informação do botão clicado
          const updatedContext = {
            ...(pendingResponse.context || {}),
            button_clicked: buttonText,
            button_id: matchedButton?.id || buttonId,
            button_index: matchedIndex,
            resumed_from_step: pendingResponse.step_id
          };

          // Chamar flows-executor para continuar a partir do branch
          console.log(`🚀 Retomando fluxo a partir do step ${matchedButton.nextStepId}`);
          
          const resumeResponse = await fetch(`${supabaseUrl}/functions/v1/flows-executor`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({
              flowId: pendingResponse.flow_id,
              leadId: pendingResponse.lead_id,
              phoneNumber: normalizedPhone,
              context: updatedContext,
              startFromStepId: matchedButton.nextStepId, // Novo parâmetro para começar de step específico
              resumeRunId: pendingResponse.run_id
            })
          });

          const resumeResult = await resumeResponse.json();
          console.log(`✅ Fluxo retomado:`, resumeResult);

          return new Response(
            JSON.stringify({
              resumed: true,
              buttonMatched: matchedButton.text,
              nextStepId: matchedButton.nextStepId,
              resumeResult
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Se não tem branch específico, apenas marcar como respondido
    return new Response(
      JSON.stringify({
        resumed: true,
        buttonMatched: matchedButton?.text || buttonText,
        message: 'Resposta registrada, sem branch configurado'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro no flows-resume:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

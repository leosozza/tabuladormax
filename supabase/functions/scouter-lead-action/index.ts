import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, leadId, scouterBitrixId } = await req.json();
    
    console.log(`[scouter-lead-action] Action: ${action}, Lead ID: ${leadId}, Scouter Bitrix ID: ${scouterBitrixId}`);

    if (!action || !leadId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing action or leadId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Bitrix credentials
    const bitrixUrl = Deno.env.get('BITRIX_URL') || 
      'https://maxcomerciogrupoybrasil.bitrix24.com.br/rest/60/ztqakxp0uhc2w8n7';

    // The lead ID in Supabase IS the Bitrix lead ID (they're the same)
    const bitrixLeadId = leadId;
    console.log(`[scouter-lead-action] Bitrix Lead ID: ${bitrixLeadId}`);

    let bitrixFields: Record<string, any> = {};
    let supabaseUpdate: Record<string, any> = {};

    switch (action) {
      case 'delete':
        // Move para "Analisar - Sem interesse" e limpa campos do scouter
        bitrixFields = {
          STATUS_ID: 'UC_GPH3PL', // Analisar - Sem interesse
          PARENT_ID_1096: '', // Limpa gestão scouter (SPA)
          UF_CRM_1742226427: '', // Limpa campo scouter
        };
        supabaseUpdate = {
          etapa: 'Analizar - Sem interesse',
          gestao_scouter: null,
          scouter: null,
          updated_at: new Date().toISOString(),
        };
        break;

      case 'resend':
        // Move para "Triagem" para reenviar confirmação
        bitrixFields = {
          STATUS_ID: 'UC_AU7EMM', // Triagem
        };
        supabaseUpdate = {
          etapa: 'Triagem',
          updated_at: new Date().toISOString(),
        };
        break;

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Ação desconhecida: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Update Bitrix
    console.log(`[scouter-lead-action] Updating Bitrix lead ${bitrixLeadId} with:`, bitrixFields);
    
    const bitrixResponse = await fetch(`${bitrixUrl}/crm.lead.update.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: bitrixLeadId,
        fields: bitrixFields,
      }),
    });

    const bitrixResult = await bitrixResponse.json();
    console.log('[scouter-lead-action] Bitrix response:', bitrixResult);

    if (!bitrixResult.result) {
      console.error('[scouter-lead-action] Bitrix update failed:', bitrixResult);
      return new Response(
        JSON.stringify({ success: false, error: 'Falha ao atualizar no Bitrix', details: bitrixResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update Supabase
    console.log(`[scouter-lead-action] Updating Supabase lead ${leadId} with:`, supabaseUpdate);
    
    const { error: updateError } = await supabase
      .from('leads')
      .update(supabaseUpdate)
      .eq('id', leadId);

    if (updateError) {
      console.error('[scouter-lead-action] Supabase update failed:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Falha ao atualizar no banco de dados', details: updateError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the action
    await supabase.from('actions_log').insert({
      lead_id: leadId,
      action_label: `scouter_${action}`,
      status: 'success',
      payload: { action, bitrixLeadId, bitrixFields, scouterBitrixId },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: action === 'delete' 
          ? 'Lead movido para análise com sucesso' 
          : 'Lead movido para triagem - confirmação será reenviada',
        bitrixResult,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[scouter-lead-action] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

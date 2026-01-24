import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkResendRequest {
  leadIds: number[];
}

interface LeadResult {
  leadId: number;
  success: boolean;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const bitrixWebhookUrl = Deno.env.get('BITRIX_WEBHOOK_URL');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { leadIds } = await req.json() as BulkResendRequest;

    // Validações
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'leadIds é obrigatório e deve ser um array não vazio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (leadIds.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Máximo de 100 leads por requisição' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📤 Iniciando reenvio em massa para ${leadIds.length} leads`);

    const results: LeadResult[] = [];
    let processed = 0;
    let skipped = 0;
    let errors = 0;

    // Buscar leads com contagem de envios
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select('id, phone_normalized, etapa')
      .in('id', leadIds);

    if (leadsError) {
      console.error('Erro ao buscar leads:', leadsError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar leads', details: leadsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar contagem de envios para cada lead
    for (const lead of leadsData || []) {
      // Contar envios de template para este lead
      const { count: sendCount } = await supabase
        .from('whatsapp_messages')
        .select('*', { count: 'exact', head: true })
        .eq('phone_number', lead.phone_normalized)
        .eq('direction', 'outbound')
        .eq('message_type', 'template');

      if ((sendCount || 0) >= 2) {
        console.log(`⏭️ Lead ${lead.id} já tem ${sendCount} envios, pulando...`);
        results.push({
          leadId: lead.id,
          success: false,
          skipped: true,
          skipReason: `Limite de 2 envios atingido (${sendCount} envios)`
        });
        skipped++;
        continue;
      }

      // Se já está em Triagem, pular
      if (lead.etapa === 'Triagem' || lead.etapa === 'UC_AU7EMM') {
        console.log(`⏭️ Lead ${lead.id} já está em Triagem, pulando...`);
        results.push({
          leadId: lead.id,
          success: false,
          skipped: true,
          skipReason: 'Lead já está em Triagem'
        });
        skipped++;
        continue;
      }

      try {
        // Atualizar no Bitrix
        if (bitrixWebhookUrl) {
          const bitrixResponse = await fetch(`${bitrixWebhookUrl}/crm.lead.update.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: lead.id,
              fields: {
                STATUS_ID: 'UC_AU7EMM' // Triagem
              }
            })
          });

          if (!bitrixResponse.ok) {
            const errorText = await bitrixResponse.text();
            throw new Error(`Bitrix error: ${errorText}`);
          }

          // Delay de 500ms entre requests para evitar rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Atualizar no Supabase
        const { error: updateError } = await supabase
          .from('leads')
          .update({
            etapa: 'Triagem',
            updated_at: new Date().toISOString()
          })
          .eq('id', lead.id);

        if (updateError) {
          throw new Error(`Supabase update error: ${updateError.message}`);
        }

        console.log(`✅ Lead ${lead.id} movido para Triagem`);
        results.push({ leadId: lead.id, success: true });
        processed++;

      } catch (error) {
        console.error(`❌ Erro ao processar lead ${lead.id}:`, error);
        results.push({
          leadId: lead.id,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
        errors++;
      }
    }

    // Registrar log da operação
    await supabase.from('actions_log').insert({
      lead_id: leadIds[0], // Usar primeiro lead como referência
      action_label: 'bulk_resend_confirmation',
      status: errors === 0 ? 'success' : 'partial',
      payload: {
        total_requested: leadIds.length,
        processed,
        skipped,
        errors,
        timestamp: new Date().toISOString()
      }
    });

    console.log(`📊 Resultado: ${processed} processados, ${skipped} pulados, ${errors} erros`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: leadIds.length,
          processed,
          skipped,
          errors
        },
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

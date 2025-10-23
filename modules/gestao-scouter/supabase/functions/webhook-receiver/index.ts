import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || ''
  );

  try {
    const payload = await req.json();
    console.log('Webhook received:', payload);

    // Log the webhook request
    const { error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        payload,
        source: payload.source || 'unknown',
        status: 'success'
      });

    if (logError) {
      console.error('Error logging webhook:', logError);
    }

    // Process the data based on type
    if (payload.type === 'ficha' && payload.data) {
      const fichaData = payload.data;

      // Transform the data to match our schema
      const transformedData = {
        nome: fichaData.nome || '',
        projeto: fichaData.projeto || fichaData.projetos || '',
        scouter: fichaData.scouter || fichaData['Gestão de Scouter'] || '',
        criado: fichaData.criado || new Date().toISOString(),
        valor_ficha: fichaData.valor_ficha || fichaData['Valor por Fichas'] || '',
        etapa: fichaData.etapa || '',
        telefone: fichaData.telefone || '',
        email: fichaData.email || '',
        localizacao: fichaData.localizacao || '',
        modelo: fichaData.modelo || '',
        idade: fichaData.idade || '',
        local_da_abordagem: fichaData.local_da_abordagem || '',
        supervisor_do_scouter: fichaData.supervisor_do_scouter || '',
        ficha_confirmada: fichaData.ficha_confirmada || 'Não',
        compareceu: fichaData.compareceu || '',
        confirmado: fichaData.confirmado || '',
        tabulacao: fichaData.tabulacao || '',
        agendado: fichaData.agendado || '',
        foto: fichaData.foto || '',
      };

      // Insert into fichas table
      const { error: insertError } = await supabase
        .from('leads')
        .insert(transformedData);

      if (insertError) {
        console.error('Error inserting ficha:', insertError);
        
        // Log the error
        await supabase
          .from('webhook_logs')
          .insert({
            payload,
            source: payload.source || 'unknown',
            status: 'error',
            error_message: insertError.message
          });

        return new Response(
          JSON.stringify({ 
            success: false, 
            error: insertError.message 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('Ficha inserted successfully');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);

    // Try to log the error
    const errorMessage = error instanceof Error ? error.message : String(error);
    try {
      await supabase
        .from('webhook_logs')
        .insert({
          payload: {},
          source: 'error',
          status: 'error',
          error_message: errorMessage
        });
    } catch (logError) {
      console.error('Error logging error:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
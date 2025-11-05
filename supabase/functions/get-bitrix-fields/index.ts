import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📡 Buscando campos do Bitrix...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar cache primeiro
    const { data: cachedFields, error: cacheError } = await supabase
      .from('bitrix_fields_cache')
      .select('*')
      .gte('cached_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Cache de 24h

    if (cachedFields && cachedFields.length > 0) {
      console.log(`✅ Retornando ${cachedFields.length} campos do cache`);
      return new Response(
        JSON.stringify({ 
          success: true,
          fields: cachedFields,
          cached: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se não tem cache, buscar do Bitrix
    const bitrixDomain = 'maxsystem.bitrix24.com.br';
    const bitrixToken = Deno.env.get('BITRIX_REST_TOKEN') || '7/338m945lx9ifjjnr';
    const bitrixUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.lead.fields`;

    console.log('🔍 Buscando campos diretamente do Bitrix:', bitrixUrl);
    const response = await fetch(bitrixUrl);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar campos do Bitrix: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.result) {
      throw new Error('Resposta inválida do Bitrix');
    }

    console.log(`✅ ${Object.keys(data.result).length} campos encontrados no Bitrix`);

    // Processar e cachear campos
    const fields = Object.entries(data.result).map(([fieldId, fieldData]: [string, any]) => ({
      field_id: fieldId,
      field_title: fieldData.title || fieldData.formLabel || fieldId,
      field_type: fieldData.type || 'string',
      list_items: fieldData.items ? fieldData.items : null
    }));

    // Salvar no cache
    const { error: upsertError } = await supabase
      .from('bitrix_fields_cache')
      .upsert(fields, { onConflict: 'field_id' });

    if (upsertError) {
      console.error('⚠️ Erro ao cachear campos:', upsertError);
      // Não bloquear resposta por erro de cache
    } else {
      console.log(`💾 ${fields.length} campos cacheados com sucesso`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        fields: fields,
        cached: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao buscar campos:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: String(error)
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

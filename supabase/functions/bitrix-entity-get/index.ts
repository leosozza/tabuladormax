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
    const { entityType, entityId } = await req.json();
    
    console.log(`📡 Buscando ${entityType} ID ${entityId} do Bitrix...`);

    if (!entityType || !entityId) {
      throw new Error('entityType e entityId são obrigatórios');
    }

    if (entityType !== 'lead' && entityType !== 'deal') {
      throw new Error('entityType deve ser "lead" ou "deal"');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar configuração do Bitrix
    const bitrixDomain = 'maxsystem.bitrix24.com.br';
    const bitrixToken = Deno.env.get('BITRIX_REST_TOKEN') || '7/338m945lx9ifjjnr';
    
    // Determinar o método correto do Bitrix
    const bitrixMethod = entityType === 'lead' ? 'crm.lead.get' : 'crm.deal.get';
    const bitrixUrl = `https://${bitrixDomain}/rest/${bitrixToken}/${bitrixMethod}?id=${entityId}`;

    console.log('🔍 Buscando do Bitrix:', bitrixUrl);
    const response = await fetch(bitrixUrl);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar ${entityType} do Bitrix: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.result) {
      throw new Error(`${entityType} não encontrado no Bitrix`);
    }

    console.log(`✅ ${entityType} encontrado no Bitrix:`, Object.keys(data.result).length, 'campos');

    // Buscar estrutura dos campos para conversão de IDs
    const fieldsMethod = entityType === 'lead' ? 'crm.lead.fields' : 'crm.deal.fields';
    const fieldsUrl = `https://${bitrixDomain}/rest/${bitrixToken}/${fieldsMethod}`;
    console.log('📋 Buscando estrutura dos campos:', fieldsUrl);
    
    const fieldsResponse = await fetch(fieldsUrl);
    const fieldsData = await fieldsResponse.json();
    
    console.log('✅ Estrutura de campos obtida:', Object.keys(fieldsData.result || {}).length, 'campos');

    return new Response(
      JSON.stringify({ 
        success: true,
        entityType,
        entityId,
        data: data.result,
        fields: fieldsData.result || {}
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao buscar entidade:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
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

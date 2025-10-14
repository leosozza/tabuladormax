import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Sincronizando lista de telemarketing do Bitrix24...');

    // URL do webhook do Bitrix24 para buscar telemarketing
    const bitrixUrl = 'https://maxsystem.bitrix24.com.br/rest/9/85e3cex48z1zc0qp/crm.item.list.json?entityTypeId=1145&select[]=title&select[]=id&start=-1';

    // Buscar dados do Bitrix24
    const response = await fetch(bitrixUrl);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar dados do Bitrix24: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.result || !data.result.items) {
      throw new Error('Formato de resposta inválido do Bitrix24');
    }

    console.log(`✅ ${data.result.items.length} operadores de telemarketing encontrados`);

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Salvar no config_kv para cache
    const { error: cacheError } = await supabase
      .from('config_kv')
      .upsert({
        key: 'bitrix_telemarketing_list',
        value: data.result.items,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      });

    if (cacheError) {
      console.error('⚠️ Erro ao cachear lista:', cacheError);
      // Não bloquear resposta por erro de cache
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        count: data.result.items.length,
        items: data.result.items
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('❌ Erro ao sincronizar telemarketing:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
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

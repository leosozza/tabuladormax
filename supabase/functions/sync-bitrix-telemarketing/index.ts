import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Sincronizando lista de telemarketing do Bitrix24...');

    // URL do webhook do Bitrix24 para buscar telemarketing com campos extras
    const bitrixUrl = 'https://maxsystem.bitrix24.com.br/rest/9/85e3cex48z1zc0qp/crm.item.list.json?entityTypeId=1144&select[]=title&select[]=id&select[]=UF_CRM_50_CHAVETELE&select[]=UF_CRM_50_CARGO&start=-1';

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

    // Processar cada item e fazer upsert na tabela telemarketing_operators
    const operatorsToUpsert = data.result.items.map((item: any) => ({
      bitrix_id: item.id,
      name: item.title,
      access_key: item.UF_CRM_50_CHAVETELE || null,
      cargo: item.UF_CRM_50_CARGO || 'agente',
      updated_at: new Date().toISOString()
    }));

    // Upsert em batch na tabela telemarketing_operators
    const { error: upsertError, data: upsertedData } = await supabase
      .from('telemarketing_operators')
      .upsert(operatorsToUpsert, {
        onConflict: 'bitrix_id',
        ignoreDuplicates: false
      })
      .select();

    if (upsertError) {
      console.error('⚠️ Erro ao fazer upsert de operadores:', upsertError);
    } else {
      console.log(`✅ ${upsertedData?.length || 0} operadores atualizados na tabela telemarketing_operators`);
    }

    // Marcar como inativos os operadores que NÃO estão mais no Bitrix
    const activeBitrixIds = data.result.items.map((item: any) => item.id);
    let deactivatedCount = 0;
    
    if (activeBitrixIds.length > 0) {
      const { data: deactivated, error: deactivateError } = await supabase
        .from('telemarketing_operators')
        .update({ 
          status: 'inativo', 
          updated_at: new Date().toISOString() 
        })
        .not('bitrix_id', 'in', `(${activeBitrixIds.join(',')})`)
        .eq('status', 'ativo')
        .select('id, name, bitrix_id');

      if (deactivateError) {
        console.error('⚠️ Erro ao desativar operadores removidos:', deactivateError);
      } else if (deactivated && deactivated.length > 0) {
        deactivatedCount = deactivated.length;
        console.log(`🗑️ ${deactivatedCount} operadores marcados como inativos (removidos do Bitrix):`, 
          deactivated.map(op => op.name).join(', '));
      }
    }

    // Salvar no config_kv para cache (compatibilidade)
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
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        count: data.result.items.length,
        items: data.result.items,
        operators_updated: upsertedData?.length || 0,
        operators_deactivated: deactivatedCount
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

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
    const { title } = await req.json();

    if (!title || !title.trim()) {
      return new Response(
        JSON.stringify({ error: 'O nome do telemarketing é obrigatório' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🆕 Criando novo operador de telemarketing: ${title}`);

    // URL do webhook do Bitrix24 para criar telemarketing
    const bitrixUrl = 'https://maxsystem.bitrix24.com.br/rest/9/85e3cex48z1zc0qp/crm.item.add.json';

    // Criar novo item no Bitrix24
    const response = await fetch(bitrixUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entityTypeId: 1144,
        fields: {
          title: title.trim()
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Erro ao criar no Bitrix24: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.result || !data.result.item) {
      throw new Error('Formato de resposta inválido do Bitrix24');
    }

    const newItem = data.result.item;
    console.log(`✅ Operador de telemarketing criado com ID: ${newItem.id}`);

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Atualizar cache - buscar lista atual e adicionar novo item
    const { data: cacheData } = await supabase
      .from('config_kv')
      .select('value')
      .eq('key', 'bitrix_telemarketing_list')
      .maybeSingle();

    let updatedList = [];
    if (cacheData?.value) {
      updatedList = [...(cacheData.value as Array<any>), newItem];
    } else {
      updatedList = [newItem];
    }

    // Atualizar cache
    await supabase
      .from('config_kv')
      .upsert({
        key: 'bitrix_telemarketing_list',
        value: updatedList,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      });

    return new Response(
      JSON.stringify({ 
        success: true,
        item: newItem
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('❌ Erro ao criar telemarketing:', error);
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

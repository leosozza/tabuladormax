import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { title } = await req.json();

    if (!title || title.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'title é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const BITRIX_WEBHOOK = Deno.env.get('BITRIX_WEBHOOK_URL') || 
      'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr';

    console.log(`🆕 Criando projeto comercial "${title}" no Bitrix (parent_id = 1120)...`);

    // Criar projeto comercial no Bitrix (parent_id = 1120)
    const url = `${BITRIX_WEBHOOK}/crm.item.add.json`;
    const body = {
      entityTypeId: 190,
      fields: {
        title: title.trim(),
        parentId: 1120
      }
    };

    console.log(`📡 Requisição ao Bitrix:`, JSON.stringify(body));

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Bitrix API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`📥 Resposta do Bitrix:`, data);

    if (!data.result?.item?.id) {
      throw new Error('Bitrix não retornou ID do item criado');
    }

    const newItem = {
      id: data.result.item.id,
      title: title.trim()
    };

    console.log(`✅ Projeto criado no Bitrix com ID ${newItem.id}`);

    // Atualizar cache no Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('💾 Atualizando cache no Supabase...');

    const { data: currentCache } = await supabase
      .from('config_kv')
      .select('value')
      .eq('key', 'bitrix_commercial_projects_list')
      .maybeSingle();

    const updatedList = currentCache?.value 
      ? [...(currentCache.value as any[]), newItem]
      : [newItem];

    await supabase
      .from('config_kv')
      .upsert({
        key: 'bitrix_commercial_projects_list',
        value: updatedList,
        updated_at: new Date().toISOString()
      });

    console.log('✅ Cache atualizado com sucesso');

    // Criar também na tabela commercial_projects do Supabase
    console.log('💾 Criando projeto na tabela commercial_projects...');
    
    const { error: projectError } = await supabase
      .from('commercial_projects')
      .insert({
        code: newItem.id.toString(),
        name: newItem.title,
        active: true
      });

    if (projectError) {
      console.error('⚠️ Erro ao criar projeto no Supabase:', projectError);
      // Não vamos falhar a operação por causa disso
    } else {
      console.log('✅ Projeto criado na tabela commercial_projects');
    }

    console.log(`✅ Projeto "${title}" criado com sucesso!`);

    return new Response(
      JSON.stringify({ result: newItem }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Erro ao criar projeto comercial:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

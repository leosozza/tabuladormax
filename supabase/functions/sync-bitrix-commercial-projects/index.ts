import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Iniciando sincronização de projetos comerciais do Bitrix...');

    const baseUrl = 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/crm.item.list.json';
    let allProjects = [];
    let start = 0;

    // Buscar todos os projetos em lotes de 50
    while (true) {
      const url = `${baseUrl}?entityTypeId=1120&select[]=id&select[]=title&start=${start}`;
      console.log(`📡 Buscando lote ${start}...`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar do Bitrix: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.result?.items || data.result.items.length === 0) {
        break;
      }

      allProjects.push(...data.result.items);
      console.log(`✅ ${allProjects.length} projetos coletados até agora`);
      
      if (data.result.items.length < 50) {
        break;
      }
      
      start += 50;
    }

    console.log(`✅ ${allProjects.length} projetos encontrados no Bitrix`);

    // Conectar ao Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Preparar dados para inserção
    const projectsToInsert = allProjects.map(p => ({
      code: p.id.toString(),
      name: p.title,
      active: true
    }));

    // Inserir/atualizar em lotes de 100
    let processed = 0;

    for (let i = 0; i < projectsToInsert.length; i += 100) {
      const batch = projectsToInsert.slice(i, i + 100);
      
      console.log(`💾 Processando lote ${i}-${i + batch.length}...`);
      
      const { error } = await supabaseClient
        .from('commercial_projects')
        .upsert(batch, { 
          onConflict: 'code',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`❌ Erro no lote ${i}-${i+100}:`, error);
        throw error;
      } else {
        processed += batch.length;
        console.log(`✅ ${processed} projetos processados`);
      }
    }

    console.log(`✅ Sincronização concluída: ${processed} projetos processados`);

    return new Response(
      JSON.stringify({ 
        success: true,
        total: allProjects.length,
        processed: processed
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        details: String(error)
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category_id = 1 } = await req.json().catch(() => ({}));
    
    // Usar mesmo padrão das outras edge functions
    const bitrixDomain = 'maxsystem.bitrix24.com.br';
    const bitrixToken = Deno.env.get('BITRIX_REST_TOKEN') || '7/338m945lx9ifjjnr';
    const bitrixWebhook = `https://${bitrixDomain}/rest/${bitrixToken}`;

    console.log(`🔍 Buscando stages da categoria ${category_id}...`);

    // Buscar stages da categoria
    const stagesResponse = await fetch(
      `${bitrixWebhook}/crm.dealcategory.stage.list?ID=${category_id}`,
      { method: 'GET' }
    );

    if (!stagesResponse.ok) {
      throw new Error(`Erro ao buscar stages: ${stagesResponse.status}`);
    }

    const stagesData = await stagesResponse.json();
    
    if (stagesData.error) {
      throw new Error(`Erro Bitrix: ${stagesData.error_description || stagesData.error}`);
    }

    const stages = stagesData.result || [];
    
    console.log(`✅ Encontrados ${stages.length} stages:`);
    stages.forEach((stage: any) => {
      console.log(`  - ${stage.STATUS_ID}: "${stage.NAME}" (sort: ${stage.SORT})`);
    });

    // Também buscar info da categoria
    const categoryResponse = await fetch(
      `${bitrixWebhook}/crm.dealcategory.get?ID=${category_id}`,
      { method: 'GET' }
    );
    
    let categoryInfo = null;
    if (categoryResponse.ok) {
      const categoryData = await categoryResponse.json();
      categoryInfo = categoryData.result;
    }

    return new Response(
      JSON.stringify({
        success: true,
        category_id,
        category_name: categoryInfo?.NAME || `Categoria ${category_id}`,
        total_stages: stages.length,
        stages: stages.map((s: any) => ({
          stage_id: s.STATUS_ID,
          name: s.NAME,
          sort: s.SORT,
          semantics: s.SEMANTICS || 'process'
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ Erro:', errorMessage);
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

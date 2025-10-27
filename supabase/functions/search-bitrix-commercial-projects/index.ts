import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface BitrixProduct {
  ID: string;
  NAME: string;
}

interface BitrixItem {
  id: string;
  title: string;
}

interface BitrixResponse {
  result?: BitrixProduct[];
  error?: string;
  error_description?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchTerm } = await req.json();

    if (!searchTerm || !searchTerm.trim()) {
      return new Response(
        JSON.stringify({ error: 'O termo de busca é obrigatório' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const trimmedSearch = searchTerm.trim();
    console.log(`🔍 Buscando produtos no Bitrix24: "${trimmedSearch}"`);

    // Using crm.product.list.json to search for products as per requirements
    const baseUrl = 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/crm.product.list.json';
    
    let allResults: BitrixItem[] = [];

    // Fetch products with filter
    console.log(`📍 Buscando produtos com filtro: "${trimmedSearch}"`);
    try {
      // Sanitize search term to prevent potential issues
      const sanitizedSearch = trimmedSearch.replace(/[<>'"]/g, '');
      
      // Build filter for product name search
      const url = `${baseUrl}?filter[NAME]=%${encodeURIComponent(sanitizedSearch)}%&select[]=ID&select[]=NAME&order[NAME]=ASC`;
      console.log(`🔗 URL de busca: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar produtos do Bitrix24: ${response.status}`);
      }

      const data: BitrixResponse = await response.json();
      
      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      // Handle response - products API returns an array directly in result
      if (Array.isArray(data.result)) {
        allResults = data.result.map((product: BitrixProduct) => ({
          id: product.ID,
          title: product.NAME
        }));
        console.log(`✅ Encontrados ${allResults.length} produtos`);
      } else {
        console.error(`⚠️ Formato de resposta inesperado:`, data);
        throw new Error('Formato de resposta da API Bitrix24 inesperado');
      }
    } catch (error) {
      console.log(`⚠️ Busca de produtos falhou: ${error}`);
      throw error;
    }

    console.log(`📊 Total de produtos encontrados: ${allResults.length}`);

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Mapear IDs do Bitrix para UUIDs do Supabase
    const bitrixIds = allResults.map(item => item.id.toString());

    console.log(`🔍 Buscando UUIDs no Supabase para ${bitrixIds.length} produtos`);

    const { data: supabaseProjects, error: dbError } = await supabaseClient
      .from('commercial_projects')
      .select('id, code, name')
      .in('code', bitrixIds);

    if (dbError) {
      console.error('❌ Erro ao buscar produtos no Supabase:', dbError);
      throw dbError;
    }

    console.log(`✅ Encontrados ${supabaseProjects?.length || 0} produtos no Supabase`);

    // Criar mapa de code (Bitrix ID) -> UUID (Supabase)
    const codeToUuidMap = new Map(
      supabaseProjects?.map(p => [p.code, p.id]) || []
    );

    // Identificar produtos ausentes no Supabase
    const missingProjects = allResults.filter(item => {
      const bitrixIdStr = item.id.toString();
      return !codeToUuidMap.has(bitrixIdStr);
    });

    // Criar produtos ausentes automaticamente
    if (missingProjects.length > 0) {
      console.log(`💾 Criando ${missingProjects.length} produtos ausentes no Supabase...`);
      
      const projectsToInsert = missingProjects.map(p => ({
        code: p.id.toString(),
        name: p.title,
        active: true
      }));

      const { data: newProjects, error: insertError } = await supabaseClient
        .from('commercial_projects')
        .insert(projectsToInsert)
        .select('id, code');

      if (!insertError && newProjects) {
        // Atualizar o mapa com os novos UUIDs
        newProjects.forEach(p => codeToUuidMap.set(p.code, p.id));
        console.log(`✅ ${newProjects.length} produtos criados com sucesso`);
      } else if (insertError) {
        console.error('❌ Erro ao criar produtos:', insertError);
      }
    }

    // Substituir IDs do Bitrix por UUIDs do Supabase
    const resultsWithStringIds = allResults
      .map(item => {
        const bitrixIdStr = item.id.toString();
        const supabaseUuid = codeToUuidMap.get(bitrixIdStr);
        
        if (!supabaseUuid) {
          console.log(`⚠️ Produto "${item.title}" (Bitrix ID: ${bitrixIdStr}) não encontrado no Supabase`);
          return null;
        }
        
        return {
          id: supabaseUuid,
          title: item.title
        };
      })
      .filter((item): item is { id: string; title: string } => item !== null);

    console.log(`✅ ${resultsWithStringIds.length} produtos mapeados para UUIDs`);

    return new Response(
      JSON.stringify({ 
        success: true,
        results: resultsWithStringIds,
        count: resultsWithStringIds.length,
        searchTerm: trimmedSearch
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('❌ Erro ao buscar produtos:', error);
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface BitrixItem {
  id: number;
  title: string;
}

interface BitrixResponse {
  result?: {
    items?: BitrixItem[];
    total?: number;
  };
  error?: string;
  error_description?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
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
    console.log(`🔍 Buscando operadores de telemarketing: "${trimmedSearch}"`);

    // Base URL do webhook do Bitrix24
    const baseUrl = 'https://maxsystem.bitrix24.com.br/rest/9/85e3cex48z1zc0qp/crm.item.list.json';
    
    let allResults: BitrixItem[] = [];
    let exactMatches: BitrixItem[] = [];
    let prefixMatches: BitrixItem[] = [];

    // Função auxiliar para buscar com filtro
    async function fetchWithFilter(filterParam: string, start = 0): Promise<BitrixResponse> {
      const url = `${baseUrl}?entityTypeId=1144&select[]=title&select[]=id${filterParam}&start=${start}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar dados do Bitrix24: ${response.status}`);
      }

      return await response.json();
    }

    // Primeira tentativa: busca exata pelo nome completo
    console.log(`📍 Tentando busca exata por: "${trimmedSearch}"`);
    try {
      const exactFilter = `&filter[%title]=${encodeURIComponent(trimmedSearch)}`;
      const exactData = await fetchWithFilter(exactFilter);
      
      if (exactData.result?.items && exactData.result.items.length > 0) {
        exactMatches = exactData.result.items;
        console.log(`✅ Encontradas ${exactMatches.length} correspondências exatas`);
      }
    } catch (error) {
      console.log(`⚠️ Busca exata falhou: ${error}`);
    }

    // Segunda tentativa: busca por nome que comece com as 3 primeiras letras
    if (exactMatches.length === 0 && trimmedSearch.length >= 3) {
      const prefix = trimmedSearch.substring(0, 3);
      console.log(`📍 Buscando nomes que começam com: "${prefix}"`);
      
      try {
        const prefixFilter = `&filter[%title]=${encodeURIComponent(prefix)}`;
        let start = 0;
        const maxResults = 50;
        
        // Buscar com paginação até 50 resultados
        while (start < maxResults) {
          const prefixData = await fetchWithFilter(prefixFilter, start);
          
          if (!prefixData.result?.items || prefixData.result.items.length === 0) {
            break;
          }

          // Filtrar apenas os que começam com o prefixo (case-insensitive)
          const filtered = prefixData.result.items.filter(item => 
            item.title.toLowerCase().startsWith(prefix.toLowerCase())
          );
          
          prefixMatches.push(...filtered);
          
          // Se não temos mais resultados ou já temos 50, parar
          if (prefixData.result.items.length < 50 || prefixMatches.length >= maxResults) {
            break;
          }
          
          start += 50;
        }
        
        // Limitar a 50 resultados
        prefixMatches = prefixMatches.slice(0, maxResults);
        console.log(`✅ Encontradas ${prefixMatches.length} correspondências por prefixo`);
      } catch (error) {
        console.log(`⚠️ Busca por prefixo falhou: ${error}`);
      }
    }

    // Combinar resultados, priorizando matches exatos
    allResults = [...exactMatches];
    
    // Adicionar matches por prefixo que não estejam já nos exatos
    if (prefixMatches.length > 0) {
      const exactIds = new Set(exactMatches.map(m => m.id));
      const uniquePrefixMatches = prefixMatches.filter(m => !exactIds.has(m.id));
      allResults.push(...uniquePrefixMatches);
    }

    // Se ainda não encontramos nada, buscar tudo e filtrar localmente
    if (allResults.length === 0) {
      console.log(`📍 Buscando todos os operadores para filtrar localmente`);
      try {
        const allData = await fetchWithFilter('', 0);
        
        if (allData.result?.items) {
          // Filtrar localmente
          const localMatches = allData.result.items.filter(item =>
            item.title.toLowerCase().includes(trimmedSearch.toLowerCase())
          );
          allResults = localMatches.slice(0, 50);
          console.log(`✅ Encontradas ${allResults.length} correspondências por filtro local`);
        }
      } catch (error) {
        console.log(`⚠️ Busca geral falhou: ${error}`);
      }
    }

    console.log(`📊 Total de resultados encontrados: ${allResults.length}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        results: allResults,
        count: allResults.length,
        searchTerm: trimmedSearch
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('❌ Erro ao buscar telemarketing:', error);
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

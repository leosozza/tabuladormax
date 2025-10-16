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
    console.log(`🔍 Buscando projetos comerciais: "${trimmedSearch}"`);

    const baseUrl = 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/crm.item.list.json';
    
    let allResults: BitrixItem[] = [];
    let exactMatches: BitrixItem[] = [];
    let prefixMatches: BitrixItem[] = [];

    async function fetchWithFilter(filterParam: string, start = 0): Promise<BitrixResponse> {
      const url = `${baseUrl}?entityTypeId=190&select[]=title&select[]=id${filterParam}&start=${start}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar dados do Bitrix24: ${response.status}`);
      }

      return await response.json();
    }

    // Passo 1: Busca exata
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

    // Passo 2: Busca por prefixo
    if (exactMatches.length === 0 && trimmedSearch.length >= 3) {
      const prefix = trimmedSearch.substring(0, 3);
      console.log(`📍 Buscando nomes que começam com: "${prefix}"`);
      
      try {
        const prefixFilter = `&filter[%title]=${encodeURIComponent(prefix)}`;
        let start = 0;
        const maxResults = 50;
        
        while (start < maxResults) {
          const prefixData = await fetchWithFilter(prefixFilter, start);
          
          if (!prefixData.result?.items || prefixData.result.items.length === 0) {
            break;
          }

          const filtered = prefixData.result.items.filter(item => 
            item.title.toLowerCase().includes(trimmedSearch.toLowerCase())
          );
          
          prefixMatches.push(...filtered);
          
          if (prefixData.result.items.length < 50 || prefixMatches.length >= maxResults) {
            break;
          }
          
          start += 50;
        }
        
        prefixMatches = prefixMatches.slice(0, maxResults);
        console.log(`✅ Encontradas ${prefixMatches.length} correspondências por prefixo`);
      } catch (error) {
        console.log(`⚠️ Busca por prefixo falhou: ${error}`);
      }
    }

    // Passo 3: Buscar tudo e filtrar localmente (se nada foi encontrado ainda)
    if (exactMatches.length === 0 && prefixMatches.length === 0) {
      console.log(`📍 Buscando todos os projetos para filtrar localmente`);
      try {
        const allData = await fetchWithFilter('', 0);
        
        if (allData.result?.items) {
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

    // Combinar resultados (só combina se não temos resultados do Passo 3)
    if (allResults.length === 0) {
      allResults = [...exactMatches];
      if (prefixMatches.length > 0) {
        const exactIds = new Set(exactMatches.map(m => m.id));
        const uniquePrefixMatches = prefixMatches.filter(m => !exactIds.has(m.id));
        allResults.push(...uniquePrefixMatches);
      }
    }

    console.log(`📊 Total de resultados encontrados: ${allResults.length}`);

    // Converter IDs para string para compatibilidade
    const resultsWithStringIds = allResults.map(item => ({
      id: item.id.toString(),
      title: item.title
    }));

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
    console.error('❌ Erro ao buscar projetos:', error);
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

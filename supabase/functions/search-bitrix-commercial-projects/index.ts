import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BitrixItem {
  id: string;
  title: string;
}

interface BitrixResponse {
  result: BitrixItem[];
  total?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { searchTerm } = await req.json();

    if (!searchTerm || searchTerm.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: 'searchTerm deve ter pelo menos 3 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const BITRIX_WEBHOOK = Deno.env.get('BITRIX_WEBHOOK_URL') || 
      'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr';

    console.log(`🔍 Buscando projetos comerciais com termo: "${searchTerm}"`);

    // Buscar projetos comerciais (parent_id = 1120)
    const fetchWithFilter = async (filterParam: string, start = 0): Promise<BitrixResponse> => {
      const url = `${BITRIX_WEBHOOK}/crm.item.list.json`;
      const body = {
        entityTypeId: 190,
        filter: { [filterParam]: searchTerm, parentId: 1120 },
        select: ['id', 'title'],
        start,
        limit: 50
      };

      console.log(`📡 Fazendo requisição ao Bitrix:`, JSON.stringify(body));

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
      return data;
    };

    // Estratégia de busca em múltiplas etapas
    let allResults: BitrixItem[] = [];
    
    // 1. Busca exata por nome completo
    console.log('1️⃣ Tentando busca exata...');
    const exactMatch = await fetchWithFilter('title');
    if (exactMatch.result && exactMatch.result.length > 0) {
      console.log(`✅ Encontrados ${exactMatch.result.length} resultados na busca exata`);
      allResults.push(...exactMatch.result);
    }

    // 2. Se não encontrou, busca por prefixo (primeiras 3 letras)
    if (allResults.length === 0) {
      console.log('2️⃣ Busca exata sem resultados, tentando prefixo...');
      const prefix = searchTerm.substring(0, 3);
      const prefixMatch = await fetchWithFilter('title');
      
      if (prefixMatch.result && prefixMatch.result.length > 0) {
        // Filtrar localmente para encontrar matches parciais
        allResults = prefixMatch.result.filter(item => 
          item.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
        console.log(`✅ Encontrados ${allResults.length} resultados após filtro local`);
      }
    }

    // Remover duplicatas e limitar a 50 resultados
    const uniqueResults = Array.from(
      new Map(allResults.map(item => [item.id, item])).values()
    ).slice(0, 50);

    console.log(`✅ Busca "${searchTerm}" retornou ${uniqueResults.length} projetos comerciais`);

    return new Response(
      JSON.stringify({ results: uniqueResults }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Erro na busca de projetos comerciais:', error);
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

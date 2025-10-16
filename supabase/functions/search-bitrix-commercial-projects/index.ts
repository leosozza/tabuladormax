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

    // Nova estratégia: buscar TODOS os projetos e filtrar localmente
    const url = `${BITRIX_WEBHOOK}/crm.item.list.json`;
    const body = {
      entityTypeId: 190,
      filter: { parentId: 1120 }, // Sem filtro de título - buscar todos
      select: ['id', 'title'],
      start: 0,
      limit: 200 // Limite maior para pegar mais projetos
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
    console.log(`📥 Resposta do Bitrix: ${data.result?.length || 0} projetos encontrados`);

    // Filtrar localmente - busca "contém" case-insensitive
    const filtered = (data.result || []).filter((item: BitrixItem) => 
      item.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    console.log(`✅ Encontrados ${filtered.length} projetos contendo "${searchTerm}"`);

    // Limitar a 50 resultados
    const results = filtered.slice(0, 50);

    return new Response(
      JSON.stringify({ results }),
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

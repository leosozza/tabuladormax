import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SchemaColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface ExportSchemaResult {
  success: boolean;
  columns_exported: number;
  target_response: any;
  processing_time_ms: number;
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const startTime = Date.now();
  
  try {
    console.log('📤 Exportando schema para Gestão Scouter...');

    // Parse request - expecting { target_url, target_api_key }
    const body = await req.json();
    const { target_url, target_api_key } = body;

    if (!target_url || !target_api_key) {
      throw new Error('target_url e target_api_key são obrigatórios');
    }

    // Get local Supabase credentials (TabuladorMax)
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Credenciais locais não configuradas');
    }

    console.log('✅ Credenciais validadas');

    // Create local client (TabuladorMax)
    const localClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    console.log('🔍 Lendo schema local da tabela leads...');

    // Read local schema using RPC function
    const { data: localColumns, error: localError } = await localClient
      .rpc('get_table_columns', { table_name: 'leads' });

    if (localError) {
      throw new Error(`Erro ao ler schema local: ${localError.message}`);
    }

    console.log(`📊 ${localColumns?.length || 0} colunas encontradas localmente`);

    if (!localColumns || localColumns.length === 0) {
      throw new Error('Nenhuma coluna encontrada na tabela leads');
    }

    // Send schema to Gestão Scouter
    console.log(`📤 Enviando schema para ${target_url}...`);

    const targetResponse = await fetch(`${target_url}/functions/v1/receive-schema-from-tabulador`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${target_api_key}`,
        'Content-Type': 'application/json',
        'apikey': target_api_key,
      },
      body: JSON.stringify({
        columns: localColumns
      }),
    });

    if (!targetResponse.ok) {
      const errorText = await targetResponse.text();
      throw new Error(`Erro ao enviar schema: ${targetResponse.status} - ${errorText}`);
    }

    const targetResult = await targetResponse.json();
    
    console.log('✅ Schema enviado com sucesso!');
    console.log('Resultado:', targetResult);

    const processingTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        columns_exported: localColumns.length,
        target_response: targetResult,
        processing_time_ms: processingTime,
      } as ExportSchemaResult),
      {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Erro ao exportar schema:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        columns_exported: 0,
        target_response: null,
        processing_time_ms: processingTime,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      } as ExportSchemaResult),
      {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

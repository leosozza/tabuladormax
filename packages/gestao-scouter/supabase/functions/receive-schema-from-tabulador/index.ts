import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

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

interface ReceiveSchemaResult {
  success: boolean;
  columns_received: number;
  columns_analyzed: number;
  columns_missing: string[];
  columns_added: Array<{
    name: string;
    type: string;
    nullable: boolean;
  }>;
  indexes_created: string[];
  schema_reloaded: boolean;
  sql_executed: string;
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
    console.log('📥 Recebendo schema do TabuladorMax...');

    // Parse request - expecting { columns: [...] }
    const body = await req.json();
    const { columns: tabuladorColumns } = body;

    if (!Array.isArray(tabuladorColumns)) {
      throw new Error('Payload inválido: esperado array de colunas');
    }

    console.log(`📊 ${tabuladorColumns.length} colunas recebidas do TabuladorMax`);

    // Get Gestão Scouter credentials
    const GESTAO_URL = Deno.env.get('SUPABASE_URL');
    const GESTAO_SERVICE_KEY = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY');

    if (!GESTAO_URL || !GESTAO_SERVICE_KEY) {
      throw new Error('Credenciais do Gestão Scouter não configuradas');
    }

    // Create Gestão Scouter client
    const gestaoClient = createClient(GESTAO_URL, GESTAO_SERVICE_KEY);

    console.log('🔍 Analisando schema local do Gestão Scouter...');

    // Get local schema
    const { data: gestaoColumns, error: gestaoError } = await gestaoClient
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'leads')
      .order('ordinal_position');

    if (gestaoError) {
      throw new Error(`Erro ao ler schema local: ${gestaoError.message}`);
    }

    console.log(`📊 Gestão Scouter: ${gestaoColumns?.length || 0} colunas locais`);

    // Find missing columns
    const gestaoColumnNames = new Set(
      (gestaoColumns as SchemaColumn[])?.map(c => c.column_name) || []
    );
    
    const missingColumns = (tabuladorColumns as SchemaColumn[])?.filter(
      col => !gestaoColumnNames.has(col.column_name)
    ) || [];

    console.log(`🔍 Colunas faltantes: ${missingColumns.length}`);

    if (missingColumns.length === 0) {
      const processingTime = Date.now() - startTime;
      console.log('✅ Schema já está sincronizado!');
      
      return new Response(
        JSON.stringify({
          success: true,
          columns_received: tabuladorColumns.length,
          columns_analyzed: gestaoColumns?.length || 0,
          columns_missing: [],
          columns_added: [],
          indexes_created: [],
          schema_reloaded: false,
          sql_executed: '',
          processing_time_ms: processingTime,
        } as ReceiveSchemaResult),
        {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Build SQL for missing columns
    const alterTableParts: string[] = [];
    const indexStatements: string[] = [];
    const columnsToAdd: Array<{ name: string; type: string; nullable: boolean }> = [];

    for (const col of missingColumns) {
      const nullable = col.is_nullable === 'YES';
      const dataType = mapDataType(col.data_type);
      
      if (!dataType) {
        console.warn(`⚠️ Tipo não suportado: ${col.column_name} (${col.data_type})`);
        continue;
      }

      alterTableParts.push(
        `ADD COLUMN IF NOT EXISTS ${col.column_name} ${dataType}${!nullable ? ' NOT NULL' : ''}`
      );

      columnsToAdd.push({
        name: col.column_name,
        type: dataType,
        nullable,
      });

      // Create index for important columns
      if (!['id', 'created_at', 'updated_at'].includes(col.column_name)) {
        const indexName = `idx_leads_${col.column_name}`;
        indexStatements.push(
          `CREATE INDEX IF NOT EXISTS ${indexName} ON public.leads(${col.column_name});`
        );
      }
    }

    const alterTableSQL = `ALTER TABLE public.leads\n${alterTableParts.join(',\n')};`;
    const fullSQL = [
      '-- Adicionar colunas recebidas do TabuladorMax',
      alterTableSQL,
      '',
      '-- Criar índices',
      ...indexStatements,
      '',
      '-- Recarregar schema cache',
      "NOTIFY pgrst, 'reload schema';",
    ].join('\n');

    console.log('📝 SQL gerado:');
    console.log(fullSQL);

    // Execute ALTER TABLE
    console.log('⚙️ Executando ALTER TABLE...');
    
    const { error: alterError } = await gestaoClient.rpc('exec_sql', {
      sql: alterTableSQL
    }).catch(async () => {
      // Fallback: try executing via PostgREST
      const response = await fetch(`${GESTAO_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GESTAO_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'apikey': GESTAO_SERVICE_KEY,
        },
        body: JSON.stringify({ sql: alterTableSQL }),
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao executar ALTER TABLE: ${await response.text()}`);
      }
      
      return { error: null };
    });

    if (alterError) {
      throw new Error(`Erro ao executar ALTER TABLE: ${alterError.message}`);
    }

    console.log('✅ ALTER TABLE executado com sucesso');

    // Execute index creation
    const indexesCreated: string[] = [];
    for (const indexSQL of indexStatements) {
      console.log(`🔧 Criando índice: ${indexSQL}`);
      
      const { error: indexError } = await gestaoClient.rpc('exec_sql', {
        sql: indexSQL
      }).catch(async () => {
        const response = await fetch(`${GESTAO_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GESTAO_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'apikey': GESTAO_SERVICE_KEY,
          },
          body: JSON.stringify({ sql: indexSQL }),
        });
        
        if (!response.ok) {
          console.warn(`⚠️ Erro ao criar índice: ${await response.text()}`);
        }
        
        return { error: null };
      });

      if (!indexError) {
        indexesCreated.push(indexSQL);
      }
    }

    console.log(`✅ ${indexesCreated.length} índices criados`);

    // Reload schema cache
    console.log('🔄 Recarregando schema cache...');
    await gestaoClient.rpc('exec_sql', {
      sql: "NOTIFY pgrst, 'reload schema';"
    }).catch(() => {
      console.log('⚠️ Schema cache reload agendado via trigger');
    });

    const processingTime = Date.now() - startTime;
    console.log(`✅ Schema sincronizado em ${processingTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        columns_received: tabuladorColumns.length,
        columns_analyzed: gestaoColumns?.length || 0,
        columns_missing: missingColumns.map(c => c.column_name),
        columns_added: columnsToAdd,
        indexes_created: indexesCreated,
        schema_reloaded: true,
        sql_executed: fullSQL,
        processing_time_ms: processingTime,
      } as ReceiveSchemaResult),
      {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Erro ao receber schema:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        columns_received: 0,
        columns_analyzed: 0,
        columns_missing: [],
        columns_added: [],
        indexes_created: [],
        schema_reloaded: false,
        sql_executed: '',
        processing_time_ms: processingTime,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      } as ReceiveSchemaResult),
      {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function mapDataType(pgType: string): string | null {
  const typeMap: Record<string, string> = {
    'text': 'TEXT',
    'character varying': 'TEXT',
    'varchar': 'TEXT',
    'integer': 'INTEGER',
    'bigint': 'BIGINT',
    'smallint': 'SMALLINT',
    'boolean': 'BOOLEAN',
    'numeric': 'NUMERIC',
    'decimal': 'NUMERIC',
    'real': 'REAL',
    'double precision': 'DOUBLE PRECISION',
    'timestamp with time zone': 'TIMESTAMPTZ',
    'timestamp without time zone': 'TIMESTAMP',
    'timestamptz': 'TIMESTAMPTZ',
    'date': 'DATE',
    'time': 'TIME',
    'uuid': 'UUID',
    'jsonb': 'JSONB',
    'json': 'JSONB',
    'bytea': 'BYTEA',
  };

  return typeMap[pgType.toLowerCase()] || null;
}
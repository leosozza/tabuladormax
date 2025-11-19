import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔍 Iniciando sincronização de campos do Gestão Scouter...');

    // 1. Buscar schema da tabela leads
    const { data: schema, error: schemaError } = await supabase.rpc('get_leads_schema');
    
    if (schemaError) {
      console.error('Erro ao buscar schema:', schemaError);
      throw schemaError;
    }

    console.log(`📊 Encontrados ${schema.length} campos na tabela leads`);

    // 2. Buscar mapeamentos existentes
    const { data: existingMappings, error: mappingsError } = await supabase
      .from('unified_field_config')
      .select('supabase_field');
    
    if (mappingsError) {
      console.error('Erro ao buscar mapeamentos:', mappingsError);
      throw mappingsError;
    }

    const existingFields = new Set(existingMappings?.map(m => m.supabase_field) || []);
    console.log(`✅ Já existem ${existingFields.size} campos mapeados`);

    // 3. Detectar novos campos
    const newFields = schema.filter((field: any) => 
      !existingFields.has(field.column_name)
    );

    console.log(`🆕 Detectados ${newFields.length} novos campos`);

    // 4. Adicionar novos campos com configurações padrão
    if (newFields.length > 0) {
      // Buscar o maior ui_priority atual
      const { data: lastMapping } = await supabase
        .from('unified_field_config')
        .select('ui_priority')
        .order('ui_priority', { ascending: false })
        .limit(1)
        .single();

      const startPriority = (lastMapping?.ui_priority || 0) + 1;

      const newMappings = newFields.map((field: any, index: number) => ({
        supabase_field: field.column_name,
        supabase_type: field.data_type,
        is_nullable: field.is_nullable,
        display_name: formatFieldName(field.column_name),
        field_type: mapPostgresTypeToFieldType(field.data_type),
        category: detectCategory(field.column_name),
        default_visible: false,
        sortable: true,
        ui_priority: startPriority + index,
        ui_active: true,
        sync_active: false,
        sync_priority: 0,
        is_hidden: false,
        formatter_function: getDefaultFormatter(field.data_type)
      }));

      const { error: insertError } = await supabase
        .from('unified_field_config')
        .insert(newMappings);
      
      if (insertError) {
        console.error('Erro ao inserir novos campos:', insertError);
        throw insertError;
      }

      console.log(`✅ ${newFields.length} novos campos adicionados com sucesso`);
    } else {
      console.log('ℹ️ Nenhum novo campo para adicionar');
    }

    return new Response(
      JSON.stringify({
        success: true,
        newFieldsDetected: newFields.length,
        totalFields: schema.length,
        existingFields: existingFields.size,
        message: newFields.length > 0 
          ? `${newFields.length} novos campos adicionados` 
          : 'Nenhum novo campo detectado'
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
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

function formatFieldName(field: string): string {
  return field
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function mapPostgresTypeToFieldType(type: string): string {
  const typeMap: Record<string, string> = {
    'text': 'text',
    'integer': 'number',
    'bigint': 'number',
    'boolean': 'boolean',
    'timestamp with time zone': 'date',
    'timestamp without time zone': 'date',
    'date': 'date',
    'numeric': 'currency',
    'double precision': 'number',
    'real': 'number',
    'jsonb': 'text',
    'json': 'text',
    'uuid': 'text'
  };
  return typeMap[type] || 'text';
}

function detectCategory(field: string): string {
  const lowerField = field.toLowerCase();
  
  if (lowerField.includes('telefone') || lowerField.includes('celular') || lowerField.includes('email')) {
    return 'contact';
  }
  if (lowerField.includes('data') || lowerField.includes('criado') || lowerField.includes('modificado') || lowerField.includes('at')) {
    return 'dates';
  }
  if (lowerField.includes('status') || lowerField.includes('etapa') || lowerField.includes('confirmad')) {
    return 'status';
  }
  if (lowerField.includes('lat') || lowerField.includes('long') || lowerField.includes('local') || lowerField.includes('address') || lowerField.includes('endereco')) {
    return 'location';
  }
  if (lowerField.includes('sync')) {
    return 'sync';
  }
  if (lowerField.includes('name') || lowerField.includes('nome') || lowerField.includes('scouter') || lowerField.includes('projeto')) {
    return 'basic';
  }
  
  return 'other';
}

function getDefaultFormatter(type: string): string | null {
  if (type.includes('timestamp') || type === 'date') {
    return 'formatDateBR';
  }
  if (type === 'boolean') {
    return 'formatBoolean';
  }
  if (type === 'numeric' && type.includes('valor')) {
    return 'formatCurrency';
  }
  return null;
}

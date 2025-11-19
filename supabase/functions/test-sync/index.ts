import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, direction, dryRun = true } = await req.json();
    
    console.log('🧪 Testando sincronização:', { leadId, direction, dryRun });

    if (!leadId || !direction) {
      throw new Error('leadId e direction são obrigatórios');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar lead do Supabase
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      throw new Error(`Lead ${leadId} não encontrado no Supabase`);
    }

    // Buscar mapeamentos ativos
    const { data: mappings, error: mappingsError } = await supabase
      .from('unified_field_config')
      .select('*')
      .eq('sync_active', true)
      .order('supabase_field', { ascending: true })
      .order('sync_priority', { ascending: true });

    if (mappingsError) {
      throw new Error('Erro ao buscar mapeamentos: ' + mappingsError.message);
    }

    console.log(`📋 ${mappings?.length || 0} mapeamentos ativos encontrados`);

    let previewData: any = {};
    let appliedMappings: any[] = [];

    if (direction === 'supabase_to_bitrix') {
      // Preview de Supabase → Bitrix
      previewData.bitrixPayload = {
        id: lead.id,
        fields: lead.raw || {}
      };

      // Aplicar mapeamentos
      for (const mapping of (mappings || [])) {
        const value = lead[mapping.supabase_field];
        if (value !== null && value !== undefined && value !== '') {
          previewData.bitrixPayload.fields[mapping.bitrix_field] = value;
          appliedMappings.push({
            supabase_field: mapping.supabase_field,
            bitrix_field: mapping.bitrix_field,
            value: value,
            transformed: false
          });
        }
      }

    } else if (direction === 'bitrix_to_supabase') {
      // Preview de Bitrix → Supabase
      // Buscar dados do Bitrix
      const bitrixDomain = 'maxsystem.bitrix24.com.br';
      const bitrixToken = Deno.env.get('BITRIX_REST_TOKEN') || '7/338m945lx9ifjjnr';
      const bitrixUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.lead.get?ID=${leadId}`;
      
      const bitrixResponse = await fetch(bitrixUrl);
      const bitrixData = await bitrixResponse.json();

      if (!bitrixData.result) {
        throw new Error('Lead não encontrado no Bitrix');
      }

      const bitrixLead = bitrixData.result;
      previewData.supabasePayload = {
        id: leadId,
        raw: bitrixLead,
        sync_source: 'bitrix',
        sync_status: 'synced',
        last_sync_at: new Date().toISOString()
      };

      // Agrupar mapeamentos por campo
      const mappingsByField = (mappings || []).reduce((acc, mapping) => {
        if (!acc[mapping.supabase_field]) {
          acc[mapping.supabase_field] = [];
        }
        acc[mapping.supabase_field].push(mapping);
        return acc;
      }, {} as Record<string, any[]>);

      // Aplicar mapeamentos com fallback
      for (const [supabaseField, fieldMappings] of Object.entries(mappingsByField)) {
        for (const mapping of (fieldMappings as any[])) {
          let value = bitrixLead[mapping.bitrix_field];
          
          // Aplicar transformação
          if (value !== null && value !== undefined && value !== '' && mapping.transform_function) {
            try {
              if (mapping.transform_function === 'toNumber') {
                value = Number(value);
              } else if (mapping.transform_function === 'toString') {
                value = String(value);
              } else if (mapping.transform_function === 'toBoolean') {
                value = value === '1' || value === 'Y' || value === true;
              }
            } catch (e) {
              console.warn(`⚠️ Erro ao transformar ${mapping.bitrix_field}:`, e);
            }
          }
          
          if (value !== null && value !== undefined && value !== '') {
            previewData.supabasePayload[supabaseField] = value;
            appliedMappings.push({
              bitrix_field: mapping.bitrix_field,
              supabase_field: supabaseField,
              value: value,
              transformed: !!mapping.transform_function,
              transform_function: mapping.transform_function,
              priority: mapping.priority
            });
            break; // Usar apenas o primeiro não-vazio (fallback)
          }
        }
      }
    }

    // Registrar teste
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user } } = token 
      ? await supabase.auth.getUser(token)
      : { data: { user: null } };

    await supabase.from('sync_test_results').insert({
      lead_id: leadId,
      direction,
      preview_data: previewData,
      executed_by: user?.id,
      result: 'success'
    });

    console.log(`✅ Preview gerado com sucesso - ${appliedMappings.length} campos mapeados`);

    return new Response(
      JSON.stringify({ 
        success: true,
        preview: previewData,
        appliedMappings,
        fieldsCount: appliedMappings.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao testar sincronização:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
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

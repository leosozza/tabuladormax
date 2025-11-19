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
    console.log('📡 Buscando campos do Bitrix...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar se deve forçar atualização
    const { force_refresh } = await req.json().catch(() => ({ force_refresh: false }));

    // Verificar cache primeiro (se não for force_refresh)
    if (!force_refresh) {
      const { data: cachedFields, error: cacheError } = await supabase
        .from('bitrix_fields_cache')
        .select('*')
        .gte('cached_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Cache de 24h

      if (cachedFields && cachedFields.length > 0) {
        console.log(`✅ Retornando ${cachedFields.length} campos do cache`);
        return new Response(
          JSON.stringify({ 
            success: true,
            fields: cachedFields,
            cached: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.log('🔄 Force refresh solicitado, buscando diretamente do Bitrix...');
    }

    // Se não tem cache, buscar do Bitrix
    const bitrixDomain = 'maxsystem.bitrix24.com.br';
    const bitrixToken = Deno.env.get('BITRIX_REST_TOKEN') || '7/338m945lx9ifjjnr';
    const bitrixUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.lead.fields`;

    console.log('🔍 Buscando campos diretamente do Bitrix:', bitrixUrl);
    const response = await fetch(bitrixUrl);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar campos do Bitrix: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.result) {
      throw new Error('Resposta inválida do Bitrix');
    }

    console.log(`✅ ${Object.keys(data.result).length} campos encontrados no Bitrix`);

    // Helper function to fetch status values for crm_status fields
    const fetchStatusValues = async (statusType: string): Promise<Array<{ ID: string; NAME: string }>> => {
      try {
        const statusUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.status.list?filter[ENTITY_ID]=${statusType}`;
        console.log(`🔍 Buscando valores de status para ${statusType}...`);
        
        const statusResponse = await fetch(statusUrl);
        if (!statusResponse.ok) {
          console.error(`⚠️ Erro ao buscar status ${statusType}: ${statusResponse.status}`);
          return [];
        }
        
        const statusData = await statusResponse.json();
        if (!statusData.result) {
          console.error(`⚠️ Resposta inválida para status ${statusType}`);
          return [];
        }
        
        console.log(`✅ ${statusData.result.length} valores encontrados para ${statusType}`);
        return statusData.result.map((item: any) => ({
          ID: item.STATUS_ID,
          NAME: item.NAME
        }));
      } catch (error) {
        console.error(`❌ Erro ao buscar valores de status para ${statusType}:`, error);
        return [];
      }
    };

    // Formatar fieldId de forma legível
    const formatFieldId = (fieldId: string): string => {
      if (fieldId.startsWith('UF_CRM_')) {
        const number = fieldId.replace('UF_CRM_', '');
        return `Campo ${number.substring(0, 8)}`;
      }
      if (fieldId.startsWith('UF_')) {
        const name = fieldId.replace('UF_', '').replace(/_/g, ' ');
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      }
      // Formatar campo padrão: CREATED_BY → Created By
      return fieldId.split('_')
        .map(word => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ');
    };

    // Extrair display name com priorização universal de labels
    const extractDisplayName = (fieldId: string, fieldData: any): string => {
      const title = fieldData.title;
      const listLabel = fieldData.listLabel;
      const formLabel = fieldData.formLabel;
      const filterLabel = fieldData.filterLabel;
      
      // 1. Priorizar listLabel se for legível (diferente do ID)
      if (listLabel && listLabel !== fieldId && listLabel.trim()) {
        return listLabel;
      }
      
      // 2. Depois formLabel
      if (formLabel && formLabel !== fieldId && formLabel.trim()) {
        return formLabel;
      }
      
      // 3. Depois filterLabel
      if (filterLabel && filterLabel !== fieldId && filterLabel.trim()) {
        return filterLabel;
      }
      
      // 4. Depois title
      if (title && title !== fieldId && title.trim()) {
        return title;
      }
      
      // 5. Último recurso: formatar o fieldId
      return formatFieldId(fieldId);
    };

    // Primeiro, coletar todos os statusTypes necessários
    const statusTypesToFetch = new Set<string>();
    Object.entries(data.result).forEach(([fieldId, fieldData]: [string, any]) => {
      if (fieldData.type === 'crm_status' && fieldData.statusType) {
        statusTypesToFetch.add(fieldData.statusType);
      }
    });

    // Buscar todos os valores de status em paralelo
    console.log(`🔄 Buscando valores para ${statusTypesToFetch.size} tipos de status...`);
    const statusValuesMap = new Map<string, Array<{ ID: string; NAME: string }>>();
    await Promise.all(
      Array.from(statusTypesToFetch).map(async (statusType) => {
        const values = await fetchStatusValues(statusType);
        statusValuesMap.set(statusType, values);
      })
    );

    // Mapear campos com list_items apropriados
    const fields = Object.entries(data.result).map(([fieldId, fieldData]: [string, any]) => {
      let listItems = null;
      
      // Para campos de enumeração, usar items direto
      if (fieldData.items) {
        listItems = fieldData.items;
      }
      // Para campos crm_status, usar os valores buscados
      else if (fieldData.type === 'crm_status' && fieldData.statusType) {
        const statusValues = statusValuesMap.get(fieldData.statusType);
        if (statusValues && statusValues.length > 0) {
          listItems = statusValues.map(sv => ({ ID: sv.ID, VALUE: sv.NAME }));
        }
      }

      return {
        field_id: fieldId,
        field_title: extractDisplayName(fieldId, fieldData),
        field_type: fieldData.type || 'string',
        list_items: listItems,
        display_name: null // Será preenchido pelo usuário se necessário
      };
    });

    // Salvar no cache
    const { error: upsertError } = await supabase
      .from('bitrix_fields_cache')
      .upsert(fields, { onConflict: 'field_id' });

    if (upsertError) {
      console.error('⚠️ Erro ao cachear campos:', upsertError);
      // Não bloquear resposta por erro de cache
    } else {
      console.log(`💾 ${fields.length} campos cacheados com sucesso`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        fields: fields,
        cached: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao buscar campos:', error);
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

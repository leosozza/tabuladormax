// FASE 5: Edge Function para receber webhooks do Bitrix24
// Recebe atualizações de leads do Bitrix e sincroniza no Supabase

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 🔧 FASE 1: Mapeamento de IDs de enumeração do Bitrix para valores boolean
const BITRIX_ENUM_TO_BOOLEAN: Record<string, Record<string, boolean | null>> = {
  'UF_CRM_1745431662': { // Cadastro Existe Foto?
    '5492': true,   // SIM
    '5494': false,  // NAO
  },
  'UF_CRM_1737378043893': { // Ficha confirmada
    '1878': true,   // Sim
    '1880': null,   // Aguardando (incerto, converter para null)
    '4892': false,  // Não confirmada
  },
  'UF_CRM_CONFIRME_FICHAS': { // Enviar confirmação de fichas
    '8976': true,   // Sim
    '8978': false,  // Não
  },
};

// Mapeamento reverso: campo Supabase → campo Bitrix
const SUPABASE_TO_BITRIX_ENUM: Record<string, string> = {
  'cadastro_existe_foto': 'UF_CRM_1745431662',
  'ficha_confirmada': 'UF_CRM_1737378043893',
};

// Mapeamento de campos que são do tipo "money" no Bitrix
const BITRIX_MONEY_FIELDS: Record<string, string> = {
  'valor_ficha': 'UF_CRM_VALORFICHA',
};

// 🔧 FASE 2: Função de conversão inteligente de enumeração → boolean
interface ConversionResult {
  converted: boolean | null;
  hasError: boolean;
  errorMsg?: string;
}

function convertBitrixEnumToBoolean(
  bitrixField: string,
  value: any
): ConversionResult {
  // Se o campo tem mapeamento de enumeração
  if (BITRIX_ENUM_TO_BOOLEAN[bitrixField]) {
    const enumMap = BITRIX_ENUM_TO_BOOLEAN[bitrixField];
    const valueStr = String(value).trim();
    
    // Tentar mapear pelo ID da enumeração
    if (enumMap.hasOwnProperty(valueStr)) {
      return {
        converted: enumMap[valueStr],
        hasError: false
      };
    }
    
    // Se não encontrou no mapeamento, registrar erro
    return {
      converted: null,
      hasError: true,
      errorMsg: `ID de enumeração "${valueStr}" não encontrado no mapeamento de ${bitrixField}. IDs válidos: ${Object.keys(enumMap).join(', ')}`
    };
  }
  
  // Se não tem mapeamento, tentar conversão padrão (para campos boolean nativos)
  const valueStr = String(value).trim();
  if (valueStr === '1' || valueStr.toLowerCase() === 'true') {
    return { converted: true, hasError: false };
  }
  if (valueStr === '0' || valueStr.toLowerCase() === 'false' || valueStr === '') {
    return { converted: false, hasError: false };
  }
  
  // Conversão falhou
  return {
    converted: null,
    hasError: true,
    errorMsg: `Valor "${value}" não pode ser convertido para boolean (campo ${bitrixField})`
  };
}

/**
 * Converte valores para integer (arredonda decimais)
 * @param value - Valor a ser convertido
 * @returns Valor inteiro ou null
 */
function toInteger(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  
  const valueStr = String(value).trim();
  const parsed = parseFloat(valueStr);
  
  if (isNaN(parsed)) {
    console.warn(`⚠️ toInteger: Valor não numérico: "${valueStr}"`);
    return null;
  }
  
  const rounded = Math.round(parsed);
  console.log(`🔢 toInteger: "${valueStr}" → ${rounded}`);
  return rounded;
}

/**
 * Converte valores de moeda do Bitrix (formato "valor|MOEDA") para numérico
 * @param value - Valor recebido do Bitrix (ex: "6|BRL", "10.50|USD")
 * @returns Objeto com valor convertido e status de erro
 */
function convertBitrixMoneyToNumeric(
  value: any
): { converted: number | null; hasError: boolean; errorMsg?: string } {
  
  if (value === null || value === undefined || value === '') {
    return { converted: null, hasError: false };
  }
  
  const valueStr = String(value).trim();
  
  // Formato esperado: "valor|MOEDA" (ex: "6|BRL", "10.50|USD")
  if (valueStr.includes('|')) {
    const parts = valueStr.split('|');
    const numericPart = parts[0].trim();
    const currency = parts[1]?.trim();
    
    const parsed = parseFloat(numericPart);
    
    if (isNaN(parsed)) {
      return {
        converted: null,
        hasError: true,
        errorMsg: `Valor de moeda inválido: "${valueStr}" (parte numérica não é número)`
      };
    }
    
    console.log(`💰 Convertendo moeda: "${valueStr}" → ${parsed} (${currency})`);
    return { converted: parsed, hasError: false };
  }
  
  // Se não tem pipe, tentar converter diretamente
  const parsed = parseFloat(valueStr);
  
  if (isNaN(parsed)) {
    return {
      converted: null,
      hasError: true,
      errorMsg: `Valor numérico inválido: "${valueStr}"`
    };
  }
  
  return { converted: parsed, hasError: false };
}

// Função para parsear datas brasileiras (dd/MM/yyyy HH:mm:ss ou dd/MM/yyyy)
const parseBrazilianDate = (dateStr: string | null | undefined): string | null => {
  if (!dateStr) return null;
  try {
    // Formato brasileiro completo: dd/MM/yyyy HH:mm:ss
    const matchFull = String(dateStr).match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (matchFull) {
      const [, day, month, year, hour, minute, second] = matchFull;
      const isoDate = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
      console.log(`✅ Data brasileira parseada: "${dateStr}" → "${isoDate}"`);
      return isoDate;
    }
    
    // Formato brasileiro apenas data: dd/MM/yyyy
    const matchDate = String(dateStr).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (matchDate) {
      const [, day, month, year] = matchDate;
      const isoDate = `${year}-${month}-${day}T00:00:00Z`;
      console.log(`✅ Data brasileira parseada: "${dateStr}" → "${isoDate}"`);
      return isoDate;
    }
    
    // Fallback: tentar parsear como ISO ou outro formato padrão
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const isoDate = date.toISOString();
      console.log(`✅ Data ISO parseada: "${dateStr}" → "${isoDate}"`);
      return isoDate;
    }
    
    console.warn(`⚠️ Não foi possível parsear data: "${dateStr}"`);
    return null;
  } catch (error) {
    console.error(`❌ Erro ao parsear data: "${dateStr}"`, error);
    return null;
  }
};

// ✅ FASE 2: Função melhorada com logs diagnósticos detalhados
async function resolveSpaEntityName(
  supabase: any,
  entityTypeId: number,
  bitrixItemId: number | null
): Promise<string | null> {
  if (!bitrixItemId) {
    console.log(`⚠️ resolveSpaEntityName(${entityTypeId}): bitrixItemId é null/undefined`);
    return null;
  }
  
  console.log(`🔍 Buscando SPA ${entityTypeId} / ID ${bitrixItemId}...`);
  
  const { data, error } = await supabase
    .from('bitrix_spa_entities')
    .select('title, bitrix_item_id')
    .eq('entity_type_id', entityTypeId)
    .eq('bitrix_item_id', bitrixItemId)
    .maybeSingle();
  
  if (error) {
    console.error(`❌ Erro ao buscar SPA ${entityTypeId}/${bitrixItemId}:`, error);
    return null;
  }
  
  if (!data) {
    console.warn(`⚠️ SPA não encontrada: entity_type_id=${entityTypeId}, bitrix_item_id=${bitrixItemId}`);
    
    // DEBUG: Buscar SPAs próximas para ajudar no diagnóstico
    const { data: nearby } = await supabase
      .from('bitrix_spa_entities')
      .select('bitrix_item_id, title')
      .eq('entity_type_id', entityTypeId)
      .limit(3);
    console.log(`   📋 SPAs disponíveis para tipo ${entityTypeId}:`, nearby);
    
    return null;
  }
  
  const title = data.title?.trim();
  console.log(`✅ SPA ${entityTypeId}/${bitrixItemId} → "${title}"`);
  return title || null;
}

interface BitrixWebhookPayload {
  event: string;
  data: {
    FIELDS: {
      ID: string;
      [key: string]: any;
    };
  };
  ts: number;
  auth: {
    access_token: string;
    domain: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ✅ Declarar variáveis no escopo da função para usar no catch
  let event = '';
  let leadId = '';
  let startTime = Date.now();
  let supabase: any;

  try {
    // Detectar Content-Type e fazer parse adequado
    const contentType = req.headers.get('content-type') || '';
    console.log('📋 Content-Type recebido:', contentType);

    let payload: BitrixWebhookPayload;

    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Parse form data do Bitrix
      const text = await req.text();
      console.log('📄 Payload bruto (form data):', text.substring(0, 500) + '...');
      
      const params = new URLSearchParams(text);
      
      // Extrair event
      const event = params.get('event') || '';
      
      // Extrair ID do lead
      const leadId = params.get('data[FIELDS][ID]') || '';
      
      // Extrair domain
      const domain = params.get('auth[domain]') || 'maxsystem.bitrix24.com.br';
      
      // Construir payload no formato esperado
      payload = {
        event,
        data: {
          FIELDS: {
            ID: leadId
          }
        },
        ts: Date.now(),
        auth: {
          access_token: '',
          domain
        }
      } as BitrixWebhookPayload;
      
      console.log('✅ Form data convertido para JSON:', payload);
    } else {
      // Parse JSON tradicional
      payload = await req.json();
      console.log('📥 Webhook recebido (JSON):', payload);
    }

    console.log('📥 Processando evento:', payload.event, 'Lead ID:', payload.data?.FIELDS?.ID);

    event = payload.event;
    leadId = payload.data?.FIELDS?.ID;
    startTime = Date.now();

    // Eventos suportados
    const supportedEvents = [
      'ONCRM_LEAD_ADD',
      'ONCRM_LEAD_UPDATE',
      'ONCRMLEADADD',
      'ONCRMLEADUPDATE',
      'ONCRM_LEAD_DELETE',
      'ONCRMLEADDELETE'
    ];

    if (!supportedEvents.includes(event)) {
      console.log('⚠️ Evento não suportado:', event);
      return new Response(
        JSON.stringify({ success: true, message: 'Event ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!leadId) {
      console.error('❌ ID do lead não fornecido no webhook');
      return new Response(
        JSON.stringify({ error: 'Lead ID missing' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Conectar ao Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabase = createClient(supabaseUrl, supabaseKey);

    // ✅ SUPORTE A DELETE
    if (event.includes('DELETE')) {
      console.log(`🗑️ Deletando lead ${leadId} do Supabase`);
      
      const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (deleteError) {
        console.error('❌ Erro ao deletar lead:', deleteError);
        throw deleteError;
      }

      console.log(`✅ Lead ${leadId} deletado com sucesso`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Lead deletado com sucesso',
          leadId: leadId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar lead completo do Bitrix via API
    const bitrixDomain = payload.auth?.domain || 'maxsystem.bitrix24.com.br';
    const bitrixToken = Deno.env.get('BITRIX_REST_TOKEN') || '7/338m945lx9ifjjnr';
    const bitrixUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.lead.get?ID=${leadId}`;
    
    console.log('🔍 Buscando lead completo do Bitrix:', bitrixUrl);
    const bitrixResponse = await fetch(bitrixUrl);
    const bitrixData = await bitrixResponse.json();

    if (!bitrixData.result) {
      console.error('❌ Lead não encontrado no Bitrix:', leadId);
      return new Response(
        JSON.stringify({ error: 'Lead not found in Bitrix' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const lead = bitrixData.result;
    console.log('✅ Lead obtido do Bitrix:', lead);

    // 1. EXTRAIR PROJETO COMERCIAL
    // Usar o campo correto UF_CRM_1741215746 que contém o código do projeto
    const projectCode = lead['UF_CRM_1741215746'];
    let commercialProjectId = null;

    if (projectCode) {
      console.log(`🔍 Buscando projeto com code: "${projectCode}"`);
      
      const { data: project, error: projectError } = await supabase
        .from('commercial_projects')
        .select('id, name, code')
        .eq('code', String(projectCode))
        .eq('active', true)
        .maybeSingle();
      
      if (project) {
        commercialProjectId = project.id;
        console.log(`✅ Projeto encontrado: ${project.name} (code: ${project.code})`);
      } else {
        console.warn(`⚠️ Projeto não encontrado para code: "${projectCode}"`, projectError);
      }
    }

    // Fallback apenas se realmente não encontrou
    if (!commercialProjectId) {
      console.warn('⚠️ Usando projeto padrão (Pinheiros) pois não foi encontrado projeto específico');
      
      const { data: defaultProject } = await supabase
        .from('commercial_projects')
        .select('id')
        .eq('code', 'PINHEIROS')
        .eq('active', true)
        .maybeSingle();
      
      commercialProjectId = defaultProject?.id;
    }

    // 2. EXTRAIR OPERADOR DE TELEMARKETING (PARENT_ID_1144)
    const bitrixTelemarketingId = lead.PARENT_ID_1144 ? Number(lead.PARENT_ID_1144) : null;
    let responsibleUserId = null;
    let responsibleName = null;
    const telemarketingName = await resolveSpaEntityName(supabase, 1144, bitrixTelemarketingId);

    if (bitrixTelemarketingId) {
      const { data: mapping } = await supabase
        .from('agent_telemarketing_mapping')
        .select('tabuladormax_user_id, bitrix_telemarketing_name')
        .eq('bitrix_telemarketing_id', bitrixTelemarketingId)
        .maybeSingle();
      
      if (mapping) {
        responsibleUserId = mapping.tabuladormax_user_id;
        responsibleName = mapping.bitrix_telemarketing_name;
      }
    }

    // 3. EXTRAIR SCOUTER (PARENT_ID_1096)
    const bitrixScouterId = lead.PARENT_ID_1096 ? Number(lead.PARENT_ID_1096) : null;
    const scouterName = await resolveSpaEntityName(supabase, 1096, bitrixScouterId);

    // 4. EXTRAIR PROJETO COMERCIAL (PARENT_ID_1120)
    const projectIdFromParent = lead.PARENT_ID_1120 ? Number(lead.PARENT_ID_1120) : null;
    const projetoComercialName = await resolveSpaEntityName(supabase, 1120, projectIdFromParent);

    console.log('📝 Dados extraídos:', {
      leadId,
      projectCode,
      commercialProjectId,
      bitrixTelemarketingId,
      telemarketingName,
      bitrixScouterId,
      scouterName,
      projectIdFromParent,
      projetoComercialName,
      responsibleUserId,
      responsibleName
    });

    // 5. BUSCAR MAPEAMENTOS CONFIGURADOS
    const { data: fieldMappings, error: mappingError } = await supabase
      .from('unified_field_config')
      .select('*')
      .eq('sync_active', true)
      .order('supabase_field', { ascending: true })
      .order('sync_priority', { ascending: true });

    if (mappingError) {
      console.error('❌ Erro ao buscar mapeamentos:', mappingError);
      throw mappingError;
    }

    console.log(`📋 ${fieldMappings?.length || 0} mapeamentos encontrados`);

    // 6. APLICAR MAPEAMENTOS DINÂMICOS
    const leadData: any = {
      id: Number(leadId),
      raw: lead,
      sync_source: 'bitrix',
      sync_status: 'synced',
      last_sync_at: new Date().toISOString(),
      updated_at: lead.DATE_MODIFY || new Date().toISOString(),
    commercial_project_id: commercialProjectId,
    responsible_user_id: responsibleUserId,
    bitrix_telemarketing_id: bitrixTelemarketingId,
    // ✅ NOMES RESOLVIDOS DAS SPAS
    telemarketing: telemarketingName,
    scouter: scouterName,
    gestao_scouter: scouterName,
    projeto_comercial: projetoComercialName
    };

    // Agrupar mapeamentos por campo de destino
    const mappingsByField = (fieldMappings || []).reduce((acc: Record<string, any[]>, mapping: any) => {
      if (!acc[mapping.supabase_field]) {
        acc[mapping.supabase_field] = [];
      }
      acc[mapping.supabase_field].push(mapping);
      return acc;
    }, {} as Record<string, any[]>);

    // Array para rastrear mapeamentos aplicados
    const appliedMappings: any[] = [];

    // Para cada campo do TabuladorMax, aplicar a primeira fonte não-vazia
    for (const [supabaseField, mappings] of Object.entries(mappingsByField)) {
      // ✅ FASE 1.2: Blindar commercial_project_id contra sobrescrita
      // Este campo crítico já foi resolvido via SPA (UUID), não deve ser mapeado dinamicamente
      if (supabaseField === 'commercial_project_id') {
        console.log('⏭️ Ignorando mapeamento dinâmico de commercial_project_id (SPA já resolveu o UUID)');
        continue;
      }

      // ✅ FASE 1.3: Blindar campos SPA de nome já resolvidos
      const SPA_NAME_FIELDS = ['scouter', 'gestao_scouter', 'telemarketing', 'projeto_comercial'];
      if (SPA_NAME_FIELDS.includes(supabaseField)) {
        console.log(`⏭️ Ignorando mapeamento dinâmico de ${supabaseField} (SPA já resolveu o nome)`);
        continue;
      }

      for (const mapping of (mappings as any[])) {
        let value = lead[mapping.bitrix_field];
        const originalValue = value;
        
        // Aplicar transformação se definida
        if (value !== null && value !== undefined && value !== '' && mapping.transform_function) {
          try {
            if (mapping.transform_function === 'toNumber') {
              value = Number(value);
            } else if (mapping.transform_function === 'toString') {
              value = String(value);
            } else if (mapping.transform_function === 'toBoolean') {
              value = value === '1' || value === 'Y' || value === true;
            } else if (mapping.transform_function === 'toInteger') {
              value = toInteger(value);
            } else if (mapping.transform_function === 'toDate') {
              // Parsear data brasileira e extrair apenas a parte yyyy-MM-dd
              const parsed = parseBrazilianDate(value);
              value = parsed ? parsed.split('T')[0] : null;
              if (!value) {
                console.warn(`⚠️ Data inválida ignorada para ${supabaseField}: "${originalValue}"`);
                continue; // Pular este mapeamento
              }
            } else if (mapping.transform_function === 'toTimestamp') {
              // Parsear data brasileira para timestamp ISO completo
              value = parseBrazilianDate(value);
              if (!value) {
                console.warn(`⚠️ Timestamp inválido ignorado para ${supabaseField}: "${originalValue}"`);
                continue; // Pular este mapeamento
              }
            }
          } catch (e) {
            console.warn(`⚠️ Erro ao transformar ${mapping.bitrix_field}:`, e);
          }
        }
        
        // Se encontrou valor, usar e parar (fallback automático)
        if (value !== null && value !== undefined && value !== '') {
          leadData[supabaseField] = value;
          appliedMappings.push({
            bitrix_field: mapping.bitrix_field,
            supabase_field: supabaseField,
            value: value,
            transformed: !!mapping.transform_function,
            transform_function: mapping.transform_function,
            priority: mapping.priority,
            display_name: mapping.display_name || null,
            bitrix_field_type: mapping.bitrix_field_type || null  // ✨ Tipo do campo
          });
          console.log(`✅ ${supabaseField} = ${mapping.bitrix_field} (prioridade ${mapping.priority})`);
          break; // Usar apenas o primeiro não-vazio
        }
      }
    }

    // Garantir que 'responsible' seja preenchido se possível (fallback final)
    if (!leadData.responsible && responsibleName) {
      leadData.responsible = responsibleName;
      appliedMappings.push({
        bitrix_field: 'PARENT_ID_1144',
        supabase_field: 'responsible',
        value: responsibleName,
        transformed: false,
        priority: 999,
        display_name: 'Operador de Telemarketing'
      });
    }

    // ✅ FASE 1: Adicionar campos SPA ao appliedMappings para exibição no Sync Monitor
    if (scouterName && bitrixScouterId) {
      appliedMappings.push({
        bitrix_field: 'PARENT_ID_1096',
        supabase_field: 'scouter',
        value: `${scouterName} (${bitrixScouterId})`,
        original_id: bitrixScouterId,
        transformed: true,
        priority: 900,
        display_name: 'Scouter',
        bitrix_field_type: 'crm_entity'
      });
    }

    if (projetoComercialName && projectIdFromParent) {
      appliedMappings.push({
        bitrix_field: 'PARENT_ID_1120',
        supabase_field: 'projeto_comercial',
        value: `${projetoComercialName} (${projectIdFromParent})`,
        original_id: projectIdFromParent,
        transformed: true,
        priority: 900,
        display_name: 'Projeto Comercial',
        bitrix_field_type: 'crm_entity'
      });
    }

    if (telemarketingName && bitrixTelemarketingId) {
      appliedMappings.push({
        bitrix_field: 'PARENT_ID_1144',
        supabase_field: 'telemarketing',
        value: `${telemarketingName} (${bitrixTelemarketingId})`,
        original_id: bitrixTelemarketingId,
        transformed: true,
        priority: 900,
        display_name: 'Telemarketing',
        bitrix_field_type: 'crm_entity'
      });
    }

    console.log('📝 Lead mapeado:', leadData);
    console.log('📊 Mapeamentos aplicados:', appliedMappings.length);

    // ✅ FASE 1: Normalizar arrays antes do upsert
    function normalizeArrayField(value: any, fieldName: string): any {
      if (!Array.isArray(value)) return value;
      
      // Array vazio = null
      if (value.length === 0) return null;
      
      // Para age: pegar primeiro número
      if (fieldName === 'age') {
        return typeof value[0] === 'number' ? value[0] : null;
      }
      
      // Para campos de texto: juntar com vírgula
      return value.join(', ');
    }

    // Aplicar normalização em campos conhecidos que podem vir como arrays
    const fieldsToNormalize = ['age', 'nome_modelo', 'etapa_fluxo', 'op_telemarketing'];
    
    for (const fieldName of fieldsToNormalize) {
      if (leadData[fieldName] !== undefined && Array.isArray(leadData[fieldName])) {
        const originalValue = JSON.stringify(leadData[fieldName]);
        leadData[fieldName] = normalizeArrayField(leadData[fieldName], fieldName);
        console.log(`🔄 Array normalizado para ${fieldName}: ${originalValue} → ${leadData[fieldName]}`);
      }
    }

    console.log('📝 Lead final após normalização:', {
      id: leadData.id,
      name: leadData.name,
      age: leadData.age,
      scouter: leadData.scouter,
      telemarketing: leadData.telemarketing,
      projeto_comercial: leadData.projeto_comercial,
      total_fields: Object.keys(leadData).length
    });

    // FASE 2: Upsert fault-tolerant - coletar erros de campos
    const fieldErrors: Array<{
      field: string;
      attempted_value: any;
      error: string;
      bitrix_field?: string;
    }> = [];

    // 🔧 FASE 3: Validação e conversão de campos booleanos (com suporte a enumerações)
    const validatedData = { ...leadData };
    const booleanFields = ['cadastro_existe_foto', 'presenca_confirmada', 'compareceu', 'ficha_confirmada'];
    
    for (const supabaseField of booleanFields) {
      if (validatedData[supabaseField] !== undefined && validatedData[supabaseField] !== null) {
        
        // Descobrir qual campo do Bitrix está mapeado para este campo Supabase
        const bitrixField = SUPABASE_TO_BITRIX_ENUM[supabaseField] || 
                           appliedMappings.find((m: any) => m.supabase_field === supabaseField)?.bitrix_field;
        
        if (!bitrixField) continue; // Campo não mapeado, pular
        
        const originalValue = validatedData[supabaseField];
        const conversion = convertBitrixEnumToBoolean(bitrixField, originalValue);
        
        if (conversion.hasError) {
          console.warn(`⚠️ Erro ao converter campo ${supabaseField} (${bitrixField}): ${conversion.errorMsg}`);
          fieldErrors.push({
            field: supabaseField,
            attempted_value: originalValue,
            error: conversion.errorMsg || 'Conversão de enumeração falhou',
            bitrix_field: bitrixField
          });
        }
        
        // SEMPRE substituir com o valor convertido (pode ser null se falhou)
        validatedData[supabaseField] = conversion.converted;
        
        console.log(`✓ Campo ${supabaseField}: "${originalValue}" → ${conversion.converted}`);
      }
    }

    // 🔧 FASE 4: Validação e conversão de campos MOEDA (money)
    const moneyFields = Object.keys(BITRIX_MONEY_FIELDS);
    
    for (const supabaseField of moneyFields) {
      if (validatedData[supabaseField] !== undefined && validatedData[supabaseField] !== null) {
        
        const bitrixField = BITRIX_MONEY_FIELDS[supabaseField];
        const originalValue = validatedData[supabaseField];
        const conversion = convertBitrixMoneyToNumeric(originalValue);
        
        if (conversion.hasError) {
          console.warn(`⚠️ Erro ao converter campo ${supabaseField} (${bitrixField}): ${conversion.errorMsg}`);
          fieldErrors.push({
            field: supabaseField,
            attempted_value: originalValue,
            error: conversion.errorMsg || 'Conversão de moeda falhou',
            bitrix_field: bitrixField
          });
        }
        
        // SEMPRE substituir com o valor convertido (pode ser null se falhou)
        validatedData[supabaseField] = conversion.converted;
        
        console.log(`✓ Campo ${supabaseField}: "${originalValue}" → ${conversion.converted}`);
      }
    }

    // Tentativa 1: Upsert completo com dados validados
    const { data: upsertedLead, error: upsertError } = await supabase
      .from('leads')
      .upsert(validatedData, { onConflict: 'id' })
      .select()
      .single();

    if (upsertError) {
      console.warn(`⚠️ Erro no upsert completo do lead ${leadData.id}, tentando salvar parcialmente...`);
      
      // Construir dados "seguros" com campos obrigatórios
      const safeData: any = {
        id: leadData.id,
        name: leadData.name || 'Nome não disponível',
        raw: leadData.raw || bitrixData,
        sync_source: 'bitrix',
        updated_at: new Date().toISOString()
      };
      
      // Tentar adicionar campos um por um (usar dados já validados!)
      for (const [key, value] of Object.entries(validatedData)) {
        if (['id', 'name', 'raw', 'sync_source', 'updated_at'].includes(key)) continue;
        
        try {
          // Validações específicas por tipo
          if (key === 'commercial_project_id' && value) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(String(value))) {
              throw new Error(`UUID inválido: "${value}"`);
            }
          }
          
          if (key === 'age' && value !== null) {
            const ageNum = Number(value);
            if (isNaN(ageNum) || ageNum < 0 || ageNum > 150) {
              throw new Error(`Idade inválida: "${value}"`);
            }
          }
          
          // Se passou validação, adicionar
          safeData[key] = value;
          
        } catch (fieldError: any) {
          fieldErrors.push({
            field: key,
            attempted_value: value,
            error: fieldError.message,
            bitrix_field: appliedMappings.find(m => m.supabase_field === key)?.bitrix_field
          });
          console.warn(`⚠️ Campo ${key} ignorado: ${fieldError.message}`);
        }
      }
      
      // Adicionar informações de erro
      if (fieldErrors.length > 0) {
        safeData.sync_errors = {
          timestamp: new Date().toISOString(),
          source: 'bitrix-webhook',
          original_error: upsertError.message,
          errors: fieldErrors
        };
        safeData.has_sync_errors = true;
      }
      
      // Tentativa final com dados "seguros"
      const { data: savedLead, error: safeSaveError } = await supabase
        .from('leads')
        .upsert(safeData, { onConflict: 'id' })
        .select()
        .single();
        
      if (safeSaveError) {
        console.error(`❌ FALHA CRÍTICA ao salvar lead ${leadData.id}:`, safeSaveError);
        
        // Registrar evento de erro mas NÃO rejeitar requisição
        await supabase.from('sync_events').insert({
          event_type: event.includes('ADD') ? 'create' : 'update',
          direction: 'bitrix_to_supabase',
          lead_id: leadData.id,
          status: 'error',
          error_message: `Falha total no salvamento: ${safeSaveError.message}. Erros de campo: ${fieldErrors.length}`,
          sync_duration_ms: Date.now() - startTime,
          field_mappings: null,
          fields_synced_count: 0
        });
        
        // Retornar sucesso parcial ao Bitrix (não quebrar webhook)
        return new Response(
          JSON.stringify({ 
            success: false,
            lead_id: leadData.id,
            error: 'Lead não pôde ser salvo, mas webhook processado',
            details: safeSaveError.message
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
      
      console.log(`⚠️ Lead ${leadData.id} salvo PARCIALMENTE (${fieldErrors.length} campos com erro, ${Object.keys(safeData).length - 5} campos ok)`);
      
      // Registrar evento de sucesso parcial
      await supabase.from('sync_events').insert({
        event_type: event.includes('ADD') ? 'create' : 'update',
        direction: 'bitrix_to_supabase',
        lead_id: leadData.id,
        status: 'partial_success',
        error_message: `${fieldErrors.length} campos com erro: ${fieldErrors.map(e => e.field).join(', ')}`,
        sync_duration_ms: Date.now() - startTime,
        field_mappings: { bitrix_to_supabase: appliedMappings },
        fields_synced_count: Object.keys(safeData).length - 5
      });
    } else if (fieldErrors.length === 0) {
      // Sucesso total - limpar erros anteriores se houver
      await supabase
        .from('leads')
        .update({ sync_errors: null, has_sync_errors: false })
        .eq('id', leadData.id);

      console.log('✅ Lead sincronizado no Supabase:', upsertedLead);
    }

    // ✅ FASE 3: Registro robusto em sync_events com try-catch
    try {
      console.log('💾 Registrando evento em sync_events...');
      
      const { error: syncEventError } = await supabase
        .from('sync_events')
        .insert({
          event_type: event.includes('ADD') ? 'create' : event.includes('UPDATE') ? 'update' : 'delete',
          direction: 'bitrix_to_supabase',
          lead_id: parseInt(leadId),
          status: 'success',
          sync_duration_ms: Date.now() - startTime,
          field_mappings: {
            bitrix_to_supabase: appliedMappings,
            spa_resolutions: {
              scouter: scouterName,
              telemarketing: telemarketingName,
              projeto_comercial: projetoComercialName
            }
          },
          fields_synced_count: appliedMappings.length
        });
      
      if (syncEventError) {
        console.error('❌ Erro ao registrar sync_event (não fatal):', syncEventError);
        // Não lançar exceção - lead já foi salvo com sucesso
      } else {
        console.log('✅ sync_event registrado com sucesso');
      }
    } catch (syncError) {
      console.error('❌ Exceção ao registrar sync_event:', syncError);
      // Não lançar - lead já foi salvo com sucesso
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Lead sincronizado com sucesso',
        leadId: leadId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // ✅ FASE 2: Registrar evento de erro em sync_events
    try {
      const numericLeadId = Number(leadId);
      const { error: syncEventError } = await supabase
        .from('sync_events')
        .insert({
          event_type: event.includes('ADD') ? 'create' : 
                      event.includes('UPDATE') ? 'update' : 
                      event.includes('DELETE') ? 'delete' : 'unknown',
          direction: 'bitrix_to_supabase',
          lead_id: isNaN(numericLeadId) ? null : numericLeadId,
          status: 'error',
          error_message: errorMessage,
          sync_duration_ms: Date.now() - startTime,
          field_mappings: null,
          fields_synced_count: 0
        });

      if (syncEventError) {
        console.error('❌ Erro ao registrar sync_event de erro:', syncEventError);
      } else {
        console.log('✅ sync_event de erro registrado');
      }
    } catch (logError) {
      console.error('❌ Exceção ao registrar sync_event de erro:', logError);
    }
    
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

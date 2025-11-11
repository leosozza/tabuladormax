import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função auxiliar para fetch com timeout
const fetchWithTimeout = async (url: string, timeout = 25000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    console.log('🔍 Requisição iniciada:', url);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    console.log('✅ Resposta recebida:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro do Bitrix:', errorText);
      throw new Error(`Bitrix retornou erro ${response.status}: ${errorText}`);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Timeout: Bitrix demorou muito para responder');
    }
    throw error;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entityType, entityId } = await req.json();
    
    console.log(`📡 Buscando ${entityType} ID ${entityId} do Bitrix...`);

    if (!entityType || !entityId) {
      throw new Error('entityType e entityId são obrigatórios');
    }

    if (entityType !== 'lead' && entityType !== 'deal') {
      throw new Error('entityType deve ser "lead" ou "deal"');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar configuração do Bitrix
    const bitrixDomain = 'maxsystem.bitrix24.com.br';
    const bitrixToken = Deno.env.get('BITRIX_REST_TOKEN') || '7/338m945lx9ifjjnr';
    
    // FASE 1: Buscar dados do deal/lead com timeout
    const bitrixMethod = entityType === 'lead' ? 'crm.lead.get' : 'crm.deal.get';
    const bitrixUrl = `https://${bitrixDomain}/rest/${bitrixToken}/${bitrixMethod}?id=${entityId}`;

    console.log('🔍 Buscando entidade do Bitrix:', bitrixUrl);
    const response = await fetchWithTimeout(bitrixUrl);

    const data = await response.json();
    
    if (!data.result) {
      throw new Error(`${entityType} não encontrado no Bitrix`);
    }

    console.log(`✅ ${entityType} encontrado no Bitrix:`, Object.keys(data.result).length, 'campos');

    // FASE 2: Buscar dados do contato (se existir CONTACT_ID)
    let contactData = null;
    if (data.result.CONTACT_ID) {
      const contactId = data.result.CONTACT_ID;
      const contactUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.contact.get?id=${contactId}`;
      console.log('👤 Buscando contato ID', contactId, ':', contactUrl);
      
      try {
        const contactResponse = await fetchWithTimeout(contactUrl);
        const contactResult = await contactResponse.json();
        if (contactResult.result) {
          contactData = contactResult.result;
          console.log('✅ Contato encontrado:', Object.keys(contactData).length, 'campos');
        }
      } catch (error) {
        console.log('⚠️ Não foi possível buscar contato:', error);
      }
    } else {
      console.log('ℹ️ Nenhum contato associado ao', entityType);
    }

    // FASE 3: Buscar estrutura dos campos do deal/lead
    const fieldsMethod = entityType === 'lead' ? 'crm.lead.fields' : 'crm.deal.fields';
    const fieldsUrl = `https://${bitrixDomain}/rest/${bitrixToken}/${fieldsMethod}`;
    console.log('📋 Buscando estrutura dos campos do', entityType, ':', fieldsUrl);
    
    const fieldsResponse = await fetchWithTimeout(fieldsUrl);
    const fieldsData = await fieldsResponse.json();
    
    console.log('✅ Estrutura de campos do', entityType, 'obtida:', Object.keys(fieldsData.result || {}).length, 'campos');

    // FASE 4: Buscar estrutura dos campos do contato
    let contactFieldsData = null;
    const contactFieldsUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.contact.fields`;
    console.log('📋 Buscando estrutura dos campos de contato:', contactFieldsUrl);
    
    try {
      const contactFieldsResponse = await fetchWithTimeout(contactFieldsUrl);
      contactFieldsData = await contactFieldsResponse.json();
      console.log('✅ Estrutura de campos de contato obtida:', Object.keys(contactFieldsData.result || {}).length, 'campos');
    } catch (error) {
      console.log('⚠️ Não foi possível buscar estrutura de campos de contato:', error);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        entityType,
        entityId,
        dealData: data.result,
        contactData: contactData,
        dealFields: fieldsData.result || {},
        contactFields: contactFieldsData?.result || {}
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao buscar entidade:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
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

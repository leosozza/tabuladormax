import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cpf } = await req.json();
    
    if (!cpf) {
      throw new Error('CPF é obrigatório');
    }

    console.log('🔍 Buscando por CPF:', cpf);

    const bitrixDomain = 'maxsystem.bitrix24.com.br';
    const bitrixToken = Deno.env.get('BITRIX_REST_TOKEN') || '7/338m945lx9ifjjnr';
    
    // Buscar contato por CPF
    const searchUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.contact.list`;
    
    console.log('📞 Chamando Bitrix API:', searchUrl);
    
    const searchResponse = await fetch(searchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filter: { 'UF_CRM_1762868654': cpf },
        select: ['ID', 'NAME', 'LAST_NAME', 'UF_CRM_1762868654', 'PHONE']
      })
    });

    const searchData = await searchResponse.json();
    
    console.log('✅ Resposta do Bitrix:', searchData);
    
    if (!searchData.result || searchData.result.length === 0) {
      console.log('❌ Nenhum contato encontrado');
      return new Response(
        JSON.stringify({ 
          success: true,
          found: false,
          message: 'Nenhum contato encontrado com este CPF'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contact = searchData.result[0];
    console.log('👤 Contato encontrado:', contact);
    
    // Buscar deals associados ao contato
    const dealsUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.deal.list`;
    const dealsResponse = await fetch(dealsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filter: { 'CONTACT_ID': contact.ID },
        select: ['ID', 'TITLE', 'STAGE_ID'],
        order: { 'DATE_CREATE': 'DESC' }
      })
    });

    const dealsData = await dealsResponse.json();
    console.log('📋 Negócios encontrados:', dealsData.result?.length || 0);

    return new Response(
      JSON.stringify({ 
        success: true,
        found: true,
        contact: {
          id: contact.ID,
          name: `${contact.NAME || ''} ${contact.LAST_NAME || ''}`.trim(),
          cpf: contact.UF_CRM_1762868654,
          phone: contact.PHONE?.[0]?.VALUE || ''
        },
        deals: dealsData.result || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao buscar por CPF:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

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
    
    // Buscar deal por CPF (CPF agora é campo do deal, não do contato)
    const searchUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.deal.list`;
    
    console.log('📞 Chamando Bitrix API:', searchUrl);
    
    const searchResponse = await fetch(searchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filter: { 'UF_CRM_1762868654': cpf },
        select: ['ID', 'TITLE', 'STAGE_ID', 'CONTACT_ID', 'UF_CRM_1762868654']
      })
    });

    const searchData = await searchResponse.json();
    
    console.log('✅ Resposta do Bitrix:', searchData);
    
    if (!searchData.result || searchData.result.length === 0) {
      console.log('❌ Nenhum negócio encontrado');
      return new Response(
        JSON.stringify({ 
          success: true,
          found: false,
          message: 'Nenhum negócio encontrado com este CPF'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deals = searchData.result;
    console.log('📋 Negócios encontrados:', deals.length);
    
    // Buscar contato do primeiro deal (se existir)
    let contact = null;
    if (deals[0].CONTACT_ID) {
      const contactUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.contact.get`;
      const contactResponse = await fetch(contactUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: deals[0].CONTACT_ID
        })
      });

      const contactData = await contactResponse.json();
      if (contactData.result) {
        contact = {
          id: contactData.result.ID,
          name: `${contactData.result.NAME || ''} ${contactData.result.LAST_NAME || ''}`.trim(),
          phone: contactData.result.PHONE?.[0]?.VALUE || ''
        };
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        found: true,
        cpf: cpf,
        contact: contact,
        deals: deals
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

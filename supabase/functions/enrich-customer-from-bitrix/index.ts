import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BITRIX_DOMAIN = 'maxsystem.bitrix24.com.br';
const BITRIX_TOKEN = Deno.env.get('BITRIX_REST_TOKEN') || '7/338m945lx9ifjjnr';

// Normalizar telefone
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const number = digits.slice(4);
    return `55${ddd}9${number}`;
  }
  return digits;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number } = await req.json();
    
    if (!phone_number) {
      return new Response(
        JSON.stringify({ error: 'phone_number é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Buscando cliente no Bitrix por telefone: ${phone_number}`);

    const normalized = normalizePhone(phone_number);
    const last9 = normalized.slice(-9);

    // 1. Buscar em Leads
    const leadUrl = `https://${BITRIX_DOMAIN}/rest/${BITRIX_TOKEN}/crm.lead.list`;
    const leadResponse = await fetch(leadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filter: { '%PHONE': last9 },
        select: ['ID', 'NAME', 'TITLE', 'PHONE', 'STATUS_ID', 'SOURCE_ID', 'PARENT_ID_1144', 'UF_CRM_1748031605674']
      })
    });
    
    const leadData = await leadResponse.json();
    console.log(`📋 Leads encontrados: ${leadData.result?.length || 0}`);

    let foundLead = null;
    
    // Validar telefone dos leads encontrados
    if (leadData.result && leadData.result.length > 0) {
      for (const lead of leadData.result) {
        const phones = lead.PHONE || [];
        for (const phoneObj of phones) {
          const leadPhoneNormalized = normalizePhone(phoneObj.VALUE || '');
          if (leadPhoneNormalized.slice(-9) === last9) {
            foundLead = lead;
            console.log(`✅ Lead validado: ID ${lead.ID} - ${lead.TITLE || lead.NAME}`);
            break;
          }
        }
        // Também verificar campo customizado de telefone
        if (!foundLead && lead.UF_CRM_1748031605674) {
          const customPhone = normalizePhone(lead.UF_CRM_1748031605674);
          if (customPhone.slice(-9) === last9) {
            foundLead = lead;
            console.log(`✅ Lead validado por campo custom: ID ${lead.ID}`);
            break;
          }
        }
        if (foundLead) break;
      }
    }

    // 2. Se não encontrou em leads, buscar em Deals
    let foundDeal = null;
    if (!foundLead) {
      const dealUrl = `https://${BITRIX_DOMAIN}/rest/${BITRIX_TOKEN}/crm.deal.list`;
      const dealResponse = await fetch(dealUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter: {},
          select: ['ID', 'TITLE', 'CONTACT_ID', 'STAGE_ID']
        })
      });
      
      // Buscar por contato com o telefone
      const contactUrl = `https://${BITRIX_DOMAIN}/rest/${BITRIX_TOKEN}/crm.contact.list`;
      const contactResponse = await fetch(contactUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter: { '%PHONE': last9 },
          select: ['ID', 'NAME', 'LAST_NAME', 'PHONE']
        })
      });
      
      const contactData = await contactResponse.json();
      console.log(`📇 Contatos encontrados: ${contactData.result?.length || 0}`);
      
      if (contactData.result && contactData.result.length > 0) {
        // Validar telefone do contato
        for (const contact of contactData.result) {
          const phones = contact.PHONE || [];
          for (const phoneObj of phones) {
            const contactPhoneNormalized = normalizePhone(phoneObj.VALUE || '');
            if (contactPhoneNormalized.slice(-9) === last9) {
              // Buscar deal vinculado a este contato
              const dealByContactUrl = `https://${BITRIX_DOMAIN}/rest/${BITRIX_TOKEN}/crm.deal.list`;
              const dealByContactResponse = await fetch(dealByContactUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  filter: { 'CONTACT_ID': contact.ID },
                  select: ['ID', 'TITLE', 'STAGE_ID'],
                  order: { 'ID': 'DESC' }
                })
              });
              
              const dealByContactData = await dealByContactResponse.json();
              if (dealByContactData.result && dealByContactData.result.length > 0) {
                foundDeal = dealByContactData.result[0];
                console.log(`✅ Deal encontrado via contato: ID ${foundDeal.ID} - ${foundDeal.TITLE}`);
              }
              break;
            }
          }
          if (foundDeal) break;
        }
      }
    }

    // 3. Se encontrou, atualizar/criar registro na tabela whatsapp_messages (vincular bitrix_id)
    if (foundLead || foundDeal) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const entityId = foundLead ? foundLead.ID : foundDeal.ID;
      const entityName = foundLead ? (foundLead.TITLE || foundLead.NAME) : foundDeal.TITLE;
      const entityType = foundLead ? 'lead' : 'deal';

      // Atualizar mensagens existentes com o bitrix_id
      const { error: updateError } = await supabase
        .from('whatsapp_messages')
        .update({ bitrix_id: entityId.toString() })
        .or(`phone_number.eq.${phone_number},phone_number.eq.${normalized}`)
        .is('bitrix_id', null);

      if (updateError) {
        console.error('⚠️ Erro ao atualizar mensagens:', updateError);
      } else {
        console.log(`✅ Mensagens atualizadas com bitrix_id: ${entityId}`);
      }

      // Também atualizar chatwoot_contacts se existir
      await supabase
        .from('chatwoot_contacts')
        .update({ bitrix_id: entityId.toString() })
        .or(`phone_number.eq.${phone_number},phone_number.eq.${normalized}`)
        .or(`bitrix_id.is.null,bitrix_id.eq.`);

      return new Response(
        JSON.stringify({
          found: true,
          type: entityType,
          lead_id: foundLead?.ID || null,
          deal_id: foundDeal?.ID || null,
          lead_name: entityName,
          phone_normalized: normalized,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Não encontrou nada
    return new Response(
      JSON.stringify({
        found: false,
        message: 'Nenhum lead ou deal encontrado no Bitrix com este telefone',
        phone_searched: last9,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('❌ Erro:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

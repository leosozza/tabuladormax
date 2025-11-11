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
    const { entityType, entityId, fields, contactFields } = await req.json();
    
    console.log(`📡 Atualizando ${entityType} ID ${entityId} no Bitrix...`, { 
      fieldsCount: Object.keys(fields).length,
      hasContactFields: !!contactFields 
    });

    if (!entityType || !entityId || !fields) {
      throw new Error('entityType, entityId e fields são obrigatórios');
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
    
    // Determinar o método correto do Bitrix
    const bitrixMethod = entityType === 'lead' ? 'crm.lead.update' : 'crm.deal.update';
    const bitrixUrl = `https://${bitrixDomain}/rest/${bitrixToken}/${bitrixMethod}`;

    // Preparar payload para Bitrix
    const payload = {
      id: entityId,
      fields: fields
    };

    console.log('🔄 Enviando atualização para Bitrix:', {
      method: bitrixMethod,
      id: entityId,
      fieldsCount: Object.keys(fields).length
    });

    const response = await fetch(bitrixUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao atualizar ${entityType} no Bitrix: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.result) {
      throw new Error(`Erro ao atualizar ${entityType} no Bitrix: ${JSON.stringify(data)}`);
    }

    console.log(`✅ ${entityType} ID ${entityId} atualizado com sucesso no Bitrix`);

    // ✅ ATUALIZAR CONTATO se fornecido
    if (contactFields && data.result) {
      try {
        // Buscar CONTACT_ID do deal/lead
        const bitrixMethod = entityType === 'lead' ? 'crm.lead.get' : 'crm.deal.get';
        const entityGetUrl = `https://${bitrixDomain}/rest/${bitrixToken}/${bitrixMethod}?ID=${entityId}`;
        const entityResponse = await fetch(entityGetUrl);
        const entityData = await entityResponse.json();
        
        const contactId = entityData?.result?.CONTACT_ID;
        
        if (contactId) {
          const contactPayload: Record<string, any> = {};
          
          // CPF
          if (contactFields.cpf) {
            contactPayload['UF_CRM_1762868654'] = contactFields.cpf;
          }
          
          // Telefone
          if (contactFields.telefone) {
            contactPayload['PHONE'] = [{ VALUE: contactFields.telefone, VALUE_TYPE: 'MOBILE' }];
          }
          
          if (Object.keys(contactPayload).length > 0) {
            const contactUpdateUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.contact.update`;
            
            const contactResponse = await fetch(contactUpdateUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: contactId, fields: contactPayload })
            });
            
            if (contactResponse.ok) {
              console.log('📞 Contato atualizado:', contactId);
            } else {
              console.error('⚠️ Erro ao atualizar contato:', await contactResponse.text());
            }
          }
        } else {
          console.warn('⚠️ Nenhum CONTACT_ID encontrado para o', entityType, entityId);
        }
      } catch (contactError) {
        console.error('⚠️ Erro ao processar contato (não crítico):', contactError);
      }
    }

    // Registrar evento de atualização
    supabase.from('sync_events').insert({
      event_type: 'update',
      direction: 'form_to_bitrix',
      status: 'success',
      entity_type: entityType,
      entity_id: entityId,
      fields_synced_count: Object.keys(fields).length
    }).then(({ error }) => {
      if (error) console.error('Erro ao registrar evento:', error);
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        entityType,
        entityId,
        updated: true,
        result: data.result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao atualizar entidade:', error);
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

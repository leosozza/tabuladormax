// ============================================
// Chatwoot Bulk Send Template
// Envio em lote de templates para múltiplas conversas
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface BulkSendRequest {
  conversation_ids?: number[];
  lead_ids?: number[];
  template_id: string;
  variables: string[];
}

interface SendResult {
  id: number;
  success: boolean;
  error?: string;
  phone_number?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const gupshupApiKey = Deno.env.get('GUPSHUP_API_KEY')!;
    const gupshupSourceNumber = Deno.env.get('GUPSHUP_SOURCE_NUMBER')!;
    const gupshupAppName = Deno.env.get('GUPSHUP_APP_NAME')!;

    if (!gupshupApiKey || !gupshupSourceNumber || !gupshupAppName) {
      throw new Error('Gupshup credentials not configured (API_KEY, SOURCE_NUMBER ou APP_NAME)');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body: BulkSendRequest = await req.json();
    const { conversation_ids, lead_ids, template_id, variables } = body;

    // Aceitar tanto conversation_ids quanto lead_ids
    const hasConversationIds = conversation_ids && conversation_ids.length > 0;
    const hasLeadIds = lead_ids && lead_ids.length > 0;

    if (!hasConversationIds && !hasLeadIds) {
      return new Response(
        JSON.stringify({ error: 'conversation_ids ou lead_ids é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!template_id) {
      return new Response(
        JSON.stringify({ error: 'template_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetCount = hasLeadIds ? lead_ids!.length : conversation_ids!.length;
    console.log(`📤 Iniciando envio em lote para ${targetCount} contatos`);

    // Buscar template pelo ID interno do Supabase
    const { data: template, error: templateError } = await supabaseAdmin
      .from('gupshup_templates')
      .select('*')
      .eq('id', template_id)
      .single();

    if (templateError || !template) {
      console.error('Template não encontrado:', template_id, templateError);
      throw new Error('Template não encontrado');
    }

    console.log(`📋 Template: ${template.display_name} (${template.template_id})`);

    // Buscar contatos - da tabela leads (mais confiável)
    let contacts: Array<{ id: number; phone_number: string; name: string; bitrix_id: string }> = [];

    if (hasLeadIds) {
      // Buscar direto da tabela leads
      const { data: leadsData, error: leadsError } = await supabaseAdmin
        .from('leads')
        .select('id, name, celular, telefone_casa')
        .in('id', lead_ids!);

      if (leadsError) {
        console.error('Erro ao buscar leads:', leadsError);
        throw new Error('Erro ao buscar leads');
      }

      contacts = (leadsData || []).map(lead => ({
        id: lead.id,
        phone_number: lead.celular || lead.telefone_casa || '',
        name: lead.name || `Lead #${lead.id}`,
        bitrix_id: String(lead.id)
      }));
    } else {
      // Buscar da tabela chatwoot_contacts
      const { data: contactsData, error: contactsError } = await supabaseAdmin
        .from('chatwoot_contacts')
        .select('conversation_id, phone_number, name, bitrix_id')
        .in('conversation_id', conversation_ids!);

      if (contactsError) {
        console.error('Erro ao buscar contatos:', contactsError);
        throw new Error('Erro ao buscar contatos');
      }

      contacts = (contactsData || []).map(contact => ({
        id: contact.conversation_id || 0,
        phone_number: contact.phone_number || '',
        name: contact.name || 'Contato',
        bitrix_id: contact.bitrix_id || ''
      }));
    }

    const results: SendResult[] = [];
    let successCount = 0;
    let failCount = 0;

    // Obter usuário que está enviando
    const { data: { user } } = await supabaseAdmin.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    );

    let senderName = 'Sistema';
    if (user) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();
      senderName = profile?.display_name || user.email || 'Sistema';
    }

    // Construir mensagem completa para salvar
    let fullMessageContent = template.template_body;
    variables.forEach((value, index) => {
      fullMessageContent = fullMessageContent.replace(`{{${index + 1}}}`, value);
    });

    // Enviar para cada contato com rate limiting
    for (const contact of contacts) {
      try {
        if (!contact.phone_number) {
          results.push({
            id: contact.id,
            success: false,
            error: 'Número de telefone não encontrado'
          });
          failCount++;
          continue;
        }

        // Formatar número (remover + e caracteres não numéricos)
        const phoneNumber = contact.phone_number.replace(/\D/g, '');

        console.log(`📱 Enviando para ${phoneNumber} (${contact.name})`);

        // Enviar via Gupshup
        const gupshupUrl = `https://api.gupshup.io/wa/api/v1/template/msg`;
        
        const formData = new URLSearchParams();
        formData.append('channel', 'whatsapp');
        formData.append('source', gupshupSourceNumber);
        formData.append('destination', phoneNumber);
        formData.append('template', JSON.stringify({
          id: template.template_id,
          params: variables
        }));
        formData.append('src.name', gupshupAppName);

        const gupshupResponse = await fetch(gupshupUrl, {
          method: 'POST',
          headers: {
            'apikey': gupshupApiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });

        const gupshupData = await gupshupResponse.json();

        if (gupshupData.status === 'submitted' || gupshupResponse.ok) {
          // Salvar mensagem na tabela whatsapp_messages
          const { error: insertError } = await supabaseAdmin
            .from('whatsapp_messages')
            .insert({
              phone_number: phoneNumber,
              bitrix_id: contact.bitrix_id || null,
              gupshup_message_id: gupshupData.messageId || null,
              direction: 'outbound',
              message_type: 'template',
              content: fullMessageContent,
              template_name: template.display_name,
              status: 'sent',
              sent_by: 'tabulador',
              sender_name: senderName
            });

          if (insertError) {
            console.error(`⚠️ Erro ao salvar mensagem para ${contact.name}:`, insertError);
          }

          // Atualizar last_message em chatwoot_contacts
          if (contact.bitrix_id) {
            await supabaseAdmin
              .from('chatwoot_contacts')
              .update({
                last_message_at: new Date().toISOString(),
                last_message_preview: `📋 ${template.display_name}`,
                last_message_direction: 'outbound'
              })
              .eq('bitrix_id', contact.bitrix_id);
          }

          results.push({
            id: contact.id,
            success: true,
            phone_number: phoneNumber
          });
          successCount++;
          console.log(`✅ Enviado com sucesso para ${contact.name}`);
        } else {
          throw new Error(gupshupData.message || 'Erro ao enviar');
        }

        // Rate limiting: aguardar 300ms entre envios
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error(`❌ Erro ao enviar para ${contact.name}:`, errorMessage);
        results.push({
          id: contact.id,
          success: false,
          error: errorMessage
        });
        failCount++;
      }
    }

    // Salvar log no banco
    if (user) {
      await supabaseAdmin.from('bulk_message_logs').insert({
        user_id: user.id,
        template_id: template_id,
        total_sent: successCount,
        total_failed: failCount,
        conversation_ids: hasLeadIds ? lead_ids : conversation_ids,
        results: results,
        completed_at: new Date().toISOString()
      });
    }

    console.log(`✅ Envio concluído: ${successCount} sucessos, ${failCount} falhas`);

    return new Response(
      JSON.stringify({
        results,
        total_sent: successCount,
        total_failed: failCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro em chatwoot-bulk-send-template:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

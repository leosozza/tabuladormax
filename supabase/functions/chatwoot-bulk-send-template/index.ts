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
  conversation_ids: number[];
  template_id: string;
  variables: string[];
}

interface SendResult {
  conversation_id: number;
  success: boolean;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const gupshupApiKey = Deno.env.get('GUPSHUP_API_KEY')!;
    const gupshupAppId = Deno.env.get('GUPSHUP_APP_ID')!;

    if (!gupshupApiKey || !gupshupAppId) {
      throw new Error('Gupshup credentials not configured');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body: BulkSendRequest = await req.json();
    const { conversation_ids, template_id, variables } = body;

    if (!conversation_ids || conversation_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'conversation_ids é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!template_id) {
      return new Response(
        JSON.stringify({ error: 'template_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📤 Iniciando envio em lote para ${conversation_ids.length} conversas`);

    // Buscar template
    const { data: template, error: templateError } = await supabaseAdmin
      .from('gupshup_templates')
      .select('*')
      .eq('id', template_id)
      .single();

    if (templateError || !template) {
      throw new Error('Template não encontrado');
    }

    console.log(`📋 Template: ${template.display_name}`);

    // Buscar dados das conversas
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('chatwoot_contacts')
      .select('conversation_id, phone_number, name')
      .in('conversation_id', conversation_ids);

    if (contactsError) {
      throw new Error('Erro ao buscar contatos');
    }

    const results: SendResult[] = [];
    let successCount = 0;
    let failCount = 0;

    // Enviar para cada conversa com rate limiting
    for (const contact of contacts || []) {
      try {
        if (!contact.phone_number) {
          results.push({
            conversation_id: contact.conversation_id,
            success: false,
            error: 'Número de telefone não encontrado'
          });
          failCount++;
          continue;
        }

        // Formatar número (remover +)
        const phoneNumber = contact.phone_number.replace('+', '');

        // Construir mensagem com variáveis
        let message = template.template_body;
        variables.forEach((value, index) => {
          message = message.replace(`{{${index + 1}}}`, value);
        });

        console.log(`📱 Enviando para ${phoneNumber} (${contact.name})`);

        // Enviar via Gupshup
        const gupshupUrl = `https://api.gupshup.io/wa/api/v1/template/msg`;
        
        const formData = new URLSearchParams();
        formData.append('channel', 'whatsapp');
        formData.append('source', gupshupAppId);
        formData.append('destination', phoneNumber);
        formData.append('template', JSON.stringify({
          id: template.template_id,
          params: variables
        }));
        formData.append('src.name', gupshupAppId);

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
          results.push({
            conversation_id: contact.conversation_id,
            success: true
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
          conversation_id: contact.conversation_id,
          success: false,
          error: errorMessage
        });
        failCount++;
      }
    }

    // Salvar log no banco
    const { data: { user } } = await supabaseAdmin.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    );

    if (user) {
      await supabaseAdmin.from('bulk_message_logs').insert({
        user_id: user.id,
        template_id: template_id,
        total_sent: successCount,
        total_failed: failCount,
        conversation_ids: conversation_ids,
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

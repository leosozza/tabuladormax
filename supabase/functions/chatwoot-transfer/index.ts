// ============================================
// Chatwoot Transfer - Automatic Conversation Assignment
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TransferRequest {
  conversation_id: number;
  operator_user_id: string;
  lead_id?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const chatwootApiToken = Deno.env.get('CHATWOOT_API_TOKEN')!;
    const chatwootAccountId = Deno.env.get('CHATWOOT_ACCOUNT_ID')!;
    const chatwootBaseUrl = Deno.env.get('CHATWOOT_BASE_URL')!;

    if (!chatwootApiToken || !chatwootAccountId || !chatwootBaseUrl) {
      throw new Error('Chatwoot credentials not configured');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const body: TransferRequest = await req.json();
    const { conversation_id, operator_user_id, lead_id } = body;

    if (!conversation_id || !operator_user_id) {
      return new Response(
        JSON.stringify({ error: 'conversation_id e operator_user_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔄 Transferindo conversa:', { conversation_id, operator_user_id, lead_id });

    // Get operator's email from profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', operator_user_id)
      .single();

    if (profileError || !profile?.email) {
      console.error('❌ Erro ao buscar perfil do operador:', profileError);
      return new Response(
        JSON.stringify({ error: 'Operador não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const operatorEmail = profile.email;
    console.log('📧 Email do operador:', operatorEmail);
    console.log('🔍 Buscando agente no Chatwoot com email:', operatorEmail);

    // Get all agents from Chatwoot to find assignee_id by email
    const agentsUrl = `${chatwootBaseUrl}/api/v1/accounts/${chatwootAccountId}/agents`;
    const agentsResponse = await fetch(agentsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': chatwootApiToken,
      },
    });

    if (!agentsResponse.ok) {
      const errorText = await agentsResponse.text();
      console.error('Erro ao buscar agentes do Chatwoot:', errorText);
      throw new Error(`Failed to fetch Chatwoot agents: ${agentsResponse.status}`);
    }

    const agents = await agentsResponse.json();
    console.log(`📋 Total de agentes encontrados: ${agents.length}`);
    
    const targetAgent = agents.find((agent: any) => agent.email === operatorEmail);

    if (!targetAgent) {
      console.error('❌ Agente não encontrado no Chatwoot:', operatorEmail);
      console.log('📋 Emails disponíveis:', agents.map((a: any) => a.email).join(', '));
      return new Response(
        JSON.stringify({ error: 'Agente não encontrado no Chatwoot' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const assigneeId = targetAgent.id;
    console.log('✅ Agente encontrado:', { id: assigneeId, name: targetAgent.name, email: targetAgent.email });

    // Transfer conversation
    const transferUrl = `${chatwootBaseUrl}/api/v1/accounts/${chatwootAccountId}/conversations/${conversation_id}/assignments`;
    console.log('📤 Request de transferência:', {
      url: transferUrl,
      assignee_id: assigneeId
    });
    
    const transferResponse = await fetch(transferUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': chatwootApiToken,
      },
      body: JSON.stringify({
        assignee_id: assigneeId,
      }),
    });

    if (!transferResponse.ok) {
      const errorText = await transferResponse.text();
      console.error('❌ Erro ao transferir conversa. Status:', transferResponse.status);
      console.error('❌ Resposta de erro:', errorText);
      throw new Error(`Failed to transfer conversation: ${transferResponse.status}`);
    }

    const transferResult = await transferResponse.json();
    console.log('✅ Conversa transferida com sucesso!');
    console.log('📦 Resposta completa do Chatwoot:', JSON.stringify(transferResult, null, 2));

    // Log transfer to actions_log if lead_id is provided
    if (lead_id) {
      await supabaseAdmin.from('actions_log').insert([{
        lead_id: lead_id,
        action_label: `Transferência Chatwoot: ${targetAgent.name || operatorEmail}`,
        payload: {
          conversation_id,
          assignee_id: assigneeId,
          operator_email: operatorEmail,
        },
        status: 'SUCCESS'
      }]);
    }

    return new Response(
      JSON.stringify({
        success: true,
        conversation_id,
        assignee_id: assigneeId,
        operator_email: operatorEmail,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro em chatwoot-transfer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

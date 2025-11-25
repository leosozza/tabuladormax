import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface SyscallConfig {
  api_url: string;
  api_token: string | null;
  default_route: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, ...params } = await req.json();

    console.log('syscall-integration action:', action, params);

    // Buscar configuração
    const { data: config } = await supabase
      .from('syscall_config')
      .select('*')
      .single();

    if (!config) {
      throw new Error('Configuração do Syscall não encontrada');
    }

    const syscallConfig = config as SyscallConfig;

    switch (action) {
      case 'get_config':
        return new Response(JSON.stringify({ config: syscallConfig }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'save_config':
        const { data: updated } = await supabase
          .from('syscall_config')
          .update({
            api_token: params.api_token,
            api_url: params.api_url,
            default_route: params.default_route,
            updated_by: params.user_id,
          })
          .eq('id', config.id)
          .select()
          .single();

        return new Response(JSON.stringify({ success: true, config: updated }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'test_connection':
        if (!syscallConfig.api_token) {
          throw new Error('Token não configurado');
        }

        const testResponse = await fetch(
          `${syscallConfig.api_url}/revo/statuscampaign`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: syscallConfig.api_token,
              campanha: 1,
            }),
          }
        );

        const testResult = await testResponse.json();
        return new Response(
          JSON.stringify({ success: testResponse.ok, result: testResult }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'login':
        const loginResponse = await fetch(
          `${syscallConfig.api_url}/revo/login?agente=${params.agent_code}&ramal=${params.ramal}&token=${syscallConfig.api_token}`,
          { method: 'GET' }
        );
        const loginResult = await loginResponse.json();
        return new Response(JSON.stringify(loginResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'logout':
        const logoutResponse = await fetch(
          `${syscallConfig.api_url}/revo/desliga`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: syscallConfig.api_token,
              agente: params.agent_code,
            }),
          }
        );
        const logoutResult = await logoutResponse.json();
        return new Response(JSON.stringify(logoutResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'pause':
        const pauseResponse = await fetch(
          `${syscallConfig.api_url}/revo/pause`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: syscallConfig.api_token,
              agente: params.agent_code,
            }),
          }
        );
        const pauseResult = await pauseResponse.json();
        return new Response(JSON.stringify(pauseResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'unpause':
        const unpauseResponse = await fetch(
          `${syscallConfig.api_url}/revo/unpause`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: syscallConfig.api_token,
              agente: params.agent_code,
            }),
          }
        );
        const unpauseResult = await unpauseResponse.json();
        return new Response(JSON.stringify(unpauseResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'create_campaign':
        const createResponse = await fetch(
          `${syscallConfig.api_url}/revo/newcampaign`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: syscallConfig.api_token,
              nome: params.nome,
              rota: params.rota || syscallConfig.default_route,
              agressividade: params.agressividade || 2,
              operadores: params.operadores || [],
            }),
          }
        );
        const createResult = await createResponse.json();

        if (createResult.campanha) {
          await supabase.from('syscall_campaigns').insert({
            syscall_campaign_id: createResult.campanha,
            nome: params.nome,
            rota: params.rota || syscallConfig.default_route,
            agressividade: params.agressividade || 2,
            operadores: params.operadores || [],
            created_by: params.user_id,
          });
        }

        return new Response(JSON.stringify(createResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'campaign_status':
        const statusResponse = await fetch(
          `${syscallConfig.api_url}/revo/statuscampaign`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: syscallConfig.api_token,
              campanha: params.syscall_campaign_id,
              acao: params.acao, // play, pause, stop
            }),
          }
        );
        const statusResult = await statusResponse.json();

        await supabase
          .from('syscall_campaigns')
          .update({ status: params.acao === 'play' ? 'ativa' : params.acao === 'pause' ? 'pausada' : 'finalizada' })
          .eq('syscall_campaign_id', params.syscall_campaign_id);

        return new Response(JSON.stringify(statusResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'upload_leads':
        const csvData = params.leads
          .map((lead: any) => `${lead.telefone},${lead.nome || ''},${lead.lead_id}`)
          .join('\n');

        const uploadResponse = await fetch(
          `${syscallConfig.api_url}/revo/uploadcampaign`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: syscallConfig.api_token,
              campanha: params.syscall_campaign_id,
              dados: csvData,
            }),
          }
        );
        const uploadResult = await uploadResponse.json();

        // Inserir leads na tabela
        const leadsToInsert = params.leads.map((lead: any) => ({
          campaign_id: params.campaign_id,
          lead_id: lead.lead_id,
          telefone: lead.telefone,
          status: 'enviado',
        }));

        await supabase.from('syscall_campaign_leads').insert(leadsToInsert);

        await supabase
          .from('syscall_campaigns')
          .update({ leads_enviados: params.leads.length })
          .eq('id', params.campaign_id);

        return new Response(JSON.stringify(uploadResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error(`Ação não suportada: ${action}`);
    }
  } catch (error) {
    console.error('Erro no syscall-integration:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

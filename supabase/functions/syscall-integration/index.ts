import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface SyscallConfig {
  api_url: string;
  api_token: string | null;
  default_route: string;
}

// Helper para criar headers com Bearer token
function getSyscallHeaders(token: string | null) {
  if (!token) throw new Error('Token não configurado');
  return {
    'Authorization': `Bearer ${token}`,
  };
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
        const testStartTime = Date.now();
        
        if (!syscallConfig.api_token || syscallConfig.api_token.trim() === '') {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Token não configurado. Configure o token na página de configuração.',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Testando conexão com Syscall:', {
          url: syscallConfig.api_url,
          hasToken: !!syscallConfig.api_token
        });
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos
        
        // Usar GET /revo/login para teste simples de conectividade
        const testUrl = `${syscallConfig.api_url}/revo/login`;
        const fullTestUrl = `${testUrl}?token=${syscallConfig.api_token}`;

        try {
          console.log('Tentando conexão com:', testUrl.replace(syscallConfig.api_token, '***'));

          const testResponse = await fetch(
            fullTestUrl,
            {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
              signal: controller.signal,
            }
          );

          clearTimeout(timeoutId);
          const duration_ms = Date.now() - testStartTime;

          console.log('Resposta recebida:', {
            status: testResponse.status,
            duration_ms
          });

          if (!testResponse.ok) {
            const errorText = await testResponse.text();
            console.error('Syscall API error:', testResponse.status, errorText);
            return new Response(
              JSON.stringify({
                success: false,
                error: `Erro na API Syscall (${testResponse.status}): ${errorText}`,
                log: {
                  timestamp: new Date().toISOString(),
                  url: testUrl,
                  method: 'GET',
                  duration_ms,
                  status_code: testResponse.status,
                  response: errorText,
                },
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const testResult = await testResponse.text();
          console.log('Syscall test successful');
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Conexão estabelecida com sucesso',
              result: testResult,
              log: {
                timestamp: new Date().toISOString(),
                url: testUrl,
                method: 'GET',
                duration_ms,
                status_code: testResponse.status,
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          clearTimeout(timeoutId);
          const duration_ms = Date.now() - testStartTime;

          const isTimeout = error instanceof Error && error.name === 'AbortError';
          
          let message = '';
          let suggestion = '';
          
          if (isTimeout) {
            message = `Timeout ao conectar com Syscall em ${syscallConfig.api_url}/revo`;
            suggestion = 'Possíveis causas: (1) URL incorreta, (2) Servidor fora do ar, (3) Firewall bloqueando conexões do Supabase. Entre em contato com o suporte do Syscall para verificar se os IPs do Supabase estão liberados no firewall.';
          } else {
            message = `Erro ao conectar com Syscall: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
            suggestion = 'Verifique se a URL e o token estão corretos.';
          }

          console.error('Erro no teste de conexão do Syscall:', {
            error: message,
            suggestion,
            duration_ms,
            error_details: error
          });

          return new Response(
            JSON.stringify({
              success: false,
              error: message,
              suggestion,
              log: {
                timestamp: new Date().toISOString(),
                url: testUrl,
                method: 'GET',
                duration_ms,
                status_code: undefined,
                response: null,
                error: message,
              },
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

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
        const logoutFormData = new URLSearchParams();
        logoutFormData.append('agente', params.agent_code);

        const logoutResponse = await fetch(
          `${syscallConfig.api_url}/revo/desliga`,
          {
            method: 'POST',
            headers: {
              ...getSyscallHeaders(syscallConfig.api_token),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: logoutFormData,
          }
        );
        const logoutResult = await logoutResponse.json();
        return new Response(JSON.stringify(logoutResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'pause':
        const pauseFormData = new URLSearchParams();
        pauseFormData.append('agente', params.agent_code);
        pauseFormData.append('id_pausa', params.id_pausa || '6');

        const pauseResponse = await fetch(
          `${syscallConfig.api_url}/revo/pause`,
          {
            method: 'POST',
            headers: {
              ...getSyscallHeaders(syscallConfig.api_token),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: pauseFormData,
          }
        );
        const pauseResult = await pauseResponse.json();
        return new Response(JSON.stringify(pauseResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'unpause':
        const unpauseFormData = new URLSearchParams();
        unpauseFormData.append('agente', params.agent_code);

        const unpauseResponse = await fetch(
          `${syscallConfig.api_url}/revo/unpause`,
          {
            method: 'POST',
            headers: {
              ...getSyscallHeaders(syscallConfig.api_token),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: unpauseFormData,
          }
        );
        const unpauseResult = await unpauseResponse.json();
        return new Response(JSON.stringify(unpauseResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'create_campaign':
        const createFormData = new FormData();
        createFormData.append('nome', params.nome);
        createFormData.append('agressividade', String(params.agressividade || 2));
        createFormData.append('cxpostal', 'false');
        
        // Adicionar operadores como array
        const operadores = params.operadores || [];
        operadores.forEach((op: string) => {
          createFormData.append('operadores[]', op);
        });
        
        // Adicionar rota
        const rota = params.rota || syscallConfig.default_route;
        createFormData.append('rotas_selecionadas[]', rota);

        const createResponse = await fetch(
          `${syscallConfig.api_url}/revo/newcampaign`,
          {
            method: 'POST',
            headers: getSyscallHeaders(syscallConfig.api_token),
            body: createFormData,
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
        const statusFormData = new FormData();
        statusFormData.append('id_campanha', String(params.syscall_campaign_id));
        statusFormData.append('status', params.status); // play, pause, stop

        const statusResponse = await fetch(
          `${syscallConfig.api_url}/revo/statuscampaign`,
          {
            method: 'POST',
            headers: getSyscallHeaders(syscallConfig.api_token),
            body: statusFormData,
          }
        );
        const statusResult = await statusResponse.json();

        await supabase
          .from('syscall_campaigns')
          .update({ status: params.status === 'play' ? 'ativa' : params.status === 'pause' ? 'pausada' : 'finalizada' })
          .eq('syscall_campaign_id', params.syscall_campaign_id);

        return new Response(JSON.stringify(statusResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'upload_leads':
        const csvData = params.leads
          .map((lead: any) => `${lead.telefone},${lead.nome || ''},${lead.lead_id}`)
          .join('\n');

        // Criar arquivo CSV como Blob
        const csvBlob = new Blob([csvData], { type: 'text/csv' });
        
        const uploadFormData = new FormData();
        uploadFormData.append('id_campanha', String(params.syscall_campaign_id));
        uploadFormData.append('arquivo', csvBlob, 'leads.csv');

        const uploadResponse = await fetch(
          `${syscallConfig.api_url}/revo/uploadcampaign`,
          {
            method: 'POST',
            headers: getSyscallHeaders(syscallConfig.api_token),
            body: uploadFormData,
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

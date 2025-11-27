import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface SyscallConfig {
  api_url: string;
  api_token: string | null;
  default_route: string;
}

// Helper para chamar Syscall via proxy
async function callSyscallViaProxy(
  path: string,
  method: string = 'GET',
  syscallToken: string,
  body?: any,
  isFormData: boolean = false
): Promise<Response> {
  const proxyUrl = Deno.env.get('SYSCALL_PROXY_URL');
  const proxySecret = Deno.env.get('SYSCALL_PROXY_SECRET');
  
  if (!proxyUrl || !proxySecret) {
    throw new Error('Proxy não configurado. Configure SYSCALL_PROXY_URL e SYSCALL_PROXY_SECRET.');
  }

  const headers: Record<string, string> = {
    'x-proxy-secret': proxySecret,
    'x-syscall-token': syscallToken,
    'Accept': 'application/json',
  };

  // Não adicionar Content-Type para FormData (browser adiciona automaticamente com boundary)
  if (!isFormData && body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  const targetUrl = `${proxyUrl}/api/syscall/${path}`;
  console.log(`[Proxy] ${method} ${targetUrl}`);

  return fetch(targetUrl, {
    method,
    headers,
    body: body || undefined,
  });
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

      case 'test_connection': {
        const testStartTime = Date.now();
        const proxyUrl = Deno.env.get('SYSCALL_PROXY_URL');
        
        if (!syscallConfig.api_token || syscallConfig.api_token.trim() === '') {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Token não configurado. Configure o token na página de configuração.',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          // 1. Testar health do proxy
          console.log('[Test] Testando health do proxy...');
          const healthResponse = await fetch(`${proxyUrl}/api/health`, {
            signal: AbortSignal.timeout(10000)
          });
          
          if (!healthResponse.ok) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Proxy indisponível',
              suggestion: 'Verifique se o proxy está rodando em https://syscall.ybrasil.com.br',
              log: {
                timestamp: new Date().toISOString(),
                success: false,
                url: `${proxyUrl}/api/health`,
                method: 'GET',
                status_code: healthResponse.status,
                error: 'Health check falhou',
                origin_ip: '72.61.51.225',
              }
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const healthData = await healthResponse.json();
          console.log('[Test] ✅ Proxy health OK:', healthData);

          // 2. Testar conexão com Syscall via proxy (usando IP fixo 72.61.51.225)
          console.log('[Test] Testando conexão com Syscall via proxy (IP: 72.61.51.225)...');
          const testResponse = await callSyscallViaProxy(
            `revo/login?token=${syscallConfig.api_token}`,
            'GET',
            syscallConfig.api_token || ''
          );

          const duration = Date.now() - testStartTime;
          const responseText = await testResponse.text();
          let responseData;

          try {
            responseData = JSON.parse(responseText);
          } catch {
            responseData = { raw: responseText };
          }

          const log = {
            timestamp: new Date().toISOString(),
            success: testResponse.ok,
            url: `${proxyUrl}/api/syscall/revo/login`,
            method: 'GET',
            duration_ms: duration,
            status_code: testResponse.status,
            response: responseData,
            origin_ip: '72.61.51.225',
          };

          if (!testResponse.ok) {
            return new Response(JSON.stringify({
              success: false,
              error: `Erro ${testResponse.status}: ${responseText}`,
              suggestion: testResponse.status === 401 
                ? 'Token inválido ou expirado. Verifique a configuração do token.'
                : testResponse.status === 403
                ? 'IP não autorizado. Verifique se o IP 72.61.51.225 foi liberado no Syscall.'
                : 'Verifique a configuração da API do Syscall.',
              log,
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          console.log('[Test] ✅ Syscall via proxy OK (IP: 72.61.51.225)');

          return new Response(JSON.stringify({
            success: true,
            message: '✅ Conexão estabelecida com sucesso via proxy (IP: 72.61.51.225)',
            log,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        } catch (error) {
          console.error('[Test] ❌ Erro:', error);
          const duration = Date.now() - testStartTime;
          
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            suggestion: 'Verifique a configuração do proxy e do Syscall',
            log: {
              timestamp: new Date().toISOString(),
              success: false,
              duration_ms: duration,
              error: error instanceof Error ? error.message : 'Erro desconhecido',
              origin_ip: '72.61.51.225',
            }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      case 'login': {
        const loginResponse = await callSyscallViaProxy(
          `revo/login?agente=${params.agent_code}&ramal=${params.ramal}&token=${syscallConfig.api_token}`,
          'GET',
          syscallConfig.api_token || ''
        );
        const loginResult = await loginResponse.json();
        return new Response(JSON.stringify(loginResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'logout': {
        const logoutFormData = new URLSearchParams();
        logoutFormData.append('agente', params.agent_code);

        const logoutResponse = await callSyscallViaProxy(
          'revo/desliga',
          'POST',
          syscallConfig.api_token || '',
          logoutFormData.toString()
        );
        const logoutResult = await logoutResponse.json();
        return new Response(JSON.stringify(logoutResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'pause': {
        const pauseFormData = new URLSearchParams();
        pauseFormData.append('agente', params.agent_code);
        pauseFormData.append('id_pausa', params.id_pausa || '6');

        const pauseResponse = await callSyscallViaProxy(
          'revo/pause',
          'POST',
          syscallConfig.api_token || '',
          pauseFormData.toString()
        );
        const pauseResult = await pauseResponse.json();
        return new Response(JSON.stringify(pauseResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'unpause': {
        const unpauseFormData = new URLSearchParams();
        unpauseFormData.append('agente', params.agent_code);

        const unpauseResponse = await callSyscallViaProxy(
          'revo/unpause',
          'POST',
          syscallConfig.api_token || '',
          unpauseFormData.toString()
        );
        const unpauseResult = await unpauseResponse.json();
        return new Response(JSON.stringify(unpauseResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create_campaign': {
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

        const createResponse = await callSyscallViaProxy(
          'revo/newcampaign',
          'POST',
          syscallConfig.api_token || '',
          createFormData,
          true // isFormData = true
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
      }

      case 'campaign_status': {
        const statusFormData = new FormData();
        statusFormData.append('id_campanha', String(params.syscall_campaign_id));
        statusFormData.append('status', params.status); // play, pause, stop

        const statusResponse = await callSyscallViaProxy(
          'revo/statuscampaign',
          'POST',
          syscallConfig.api_token || '',
          statusFormData,
          true // isFormData = true
        );
        const statusResult = await statusResponse.json();

        await supabase
          .from('syscall_campaigns')
          .update({ status: params.status === 'play' ? 'ativa' : params.status === 'pause' ? 'pausada' : 'finalizada' })
          .eq('syscall_campaign_id', params.syscall_campaign_id);

        return new Response(JSON.stringify(statusResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'upload_leads': {
        const csvData = params.leads
          .map((lead: any) => `${lead.telefone},${lead.nome || ''},${lead.lead_id}`)
          .join('\n');

        // Criar arquivo CSV como Blob
        const csvBlob = new Blob([csvData], { type: 'text/csv' });
        
        const uploadFormData = new FormData();
        uploadFormData.append('id_campanha', String(params.syscall_campaign_id));
        uploadFormData.append('arquivo', csvBlob, 'leads.csv');

        const uploadResponse = await callSyscallViaProxy(
          'revo/uploadcampaign',
          'POST',
          syscallConfig.api_token || '',
          uploadFormData,
          true // isFormData = true
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
      }

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

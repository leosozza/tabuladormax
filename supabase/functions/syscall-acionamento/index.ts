import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Proxy configuration
const PROXY_URL = Deno.env.get('SYSCALL_PROXY_URL');
const PROXY_SECRET = Deno.env.get('SYSCALL_PROXY_SECRET');

// Helper function to call Syscall API via proxy (fixed IP)
async function callSyscallViaProxy(
  endpoint: string,
  method: string,
  token: string,
  body?: Record<string, unknown>
): Promise<Response> {
  if (!PROXY_URL) {
    throw new Error('SYSCALL_PROXY_URL não configurado');
  }

  const proxyEndpoint = `${PROXY_URL}/api/syscall/${endpoint}`;
  console.log(`🔄 Chamando Syscall via proxy: ${method} ${proxyEndpoint}`);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (PROXY_SECRET) {
    headers['X-Proxy-Secret'] = PROXY_SECRET;
  }

  const requestBody: Record<string, unknown> = {
    token,
  };

  if (body) {
    requestBody.body = body;
  }

  const response = await fetch(proxyEndpoint, {
    method: 'POST', // Proxy always receives POST
    headers,
    body: JSON.stringify({
      method,
      ...requestBody,
    }),
  });

  console.log(`📥 Resposta do proxy: ${response.status} ${response.statusText}`);
  return response;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { lead_id, call_id, tabulacao, result, agent_code } = await req.json();

    console.log('📞 syscall-acionamento:', { lead_id, call_id, tabulacao });

    // Buscar configuração
    const { data: config } = await supabase
      .from('syscall_config')
      .select('*')
      .single();

    if (!config || !config.api_token) {
      throw new Error('Configuração do Syscall não encontrada');
    }

    // Enviar acionamento para Syscall VIA PROXY
    console.log('📤 Enviando acionamento via proxy...');
    const acionamentoResponse = await callSyscallViaProxy(
      'revo/acionamento',
      'POST',
      config.api_token,
      {
        idligacao: call_id,
        acionamento: tabulacao,
      }
    );

    const acionamentoResult = await acionamentoResponse.json();
    console.log('✅ Acionamento enviado via proxy:', acionamentoResult);

    // Baixar gravação VIA PROXY
    let recordingPath = null;
    try {
      console.log('🎙️ Baixando gravação via proxy...');
      const audioResponse = await callSyscallViaProxy(
        `revo/audio?idligacao=${call_id}`,
        'GET',
        config.api_token
      );

      if (audioResponse.ok) {
        const audioBlob = await audioResponse.blob();
        const fileName = `recordings/${lead_id}_${call_id}_${Date.now()}.wav`;

        console.log(`💾 Salvando gravação: ${fileName} (${audioBlob.size} bytes)`);

        // Salvar no Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('call-recordings')
          .upload(fileName, audioBlob, {
            contentType: 'audio/wav',
          });

        if (uploadError) {
          console.error('❌ Erro ao salvar gravação:', uploadError);
        } else {
          recordingPath = uploadData.path;
          console.log('✅ Gravação salva:', recordingPath);
        }
      } else {
        console.log(`⚠️ Gravação não disponível: ${audioResponse.status}`);
      }
    } catch (audioError) {
      console.error('❌ Erro ao baixar gravação via proxy:', audioError);
    }

    // Salvar registro da chamada
    const { data: callRecord } = await supabase
      .from('lead_call_records')
      .insert({
        lead_id,
        syscall_call_id: call_id,
        result,
        tabulacao,
        agent_code,
        recording_path: recordingPath,
        recording_url: recordingPath
          ? `${supabaseUrl}/storage/v1/object/public/call-recordings/${recordingPath}`
          : null,
        ended_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Atualizar lead
    await supabase
      .from('leads')
      .update({
        status_tabulacao: tabulacao,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead_id);

    console.log('✅ syscall-acionamento concluído com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        acionamento: acionamentoResult,
        call_record: callRecord,
        recording_path: recordingPath,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Erro no syscall-acionamento:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

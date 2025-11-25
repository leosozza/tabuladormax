import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { lead_id, call_id, tabulacao, result, agent_code } = await req.json();

    console.log('syscall-acionamento:', { lead_id, call_id, tabulacao });

    // Buscar configuração
    const { data: config } = await supabase
      .from('syscall_config')
      .select('*')
      .single();

    if (!config || !config.api_token) {
      throw new Error('Configuração do Syscall não encontrada');
    }

    // Enviar acionamento para Syscall
    const acionamentoResponse = await fetch(
      `${config.api_url}/revo/acionamento`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: config.api_token,
          idligacao: call_id,
          acionamento: tabulacao,
        }),
      }
    );

    const acionamentoResult = await acionamentoResponse.json();
    console.log('Acionamento enviado:', acionamentoResult);

    // Baixar gravação
    let recordingPath = null;
    try {
      const audioResponse = await fetch(
        `${config.api_url}/revo/audio?idligacao=${call_id}&token=${config.api_token}`,
        { method: 'GET' }
      );

      if (audioResponse.ok) {
        const audioBlob = await audioResponse.blob();
        const fileName = `recordings/${lead_id}_${call_id}_${Date.now()}.wav`;

        // Salvar no Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('call-recordings')
          .upload(fileName, audioBlob, {
            contentType: 'audio/wav',
          });

        if (uploadError) {
          console.error('Erro ao salvar gravação:', uploadError);
        } else {
          recordingPath = uploadData.path;
          console.log('Gravação salva:', recordingPath);
        }
      }
    } catch (audioError) {
      console.error('Erro ao baixar gravação:', audioError);
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
    console.error('Erro no syscall-acionamento:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

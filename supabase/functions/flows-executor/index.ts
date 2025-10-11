import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { runTabular } from '../../../src/handlers/tabular.ts';
import { execHttpCall } from '../../../src/handlers/httpCall.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function wait(ms: number) {
  if (!ms || ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const runId: string | undefined = payload?.runId;
    const input = payload?.input ?? {};

    if (!runId) {
      return new Response(JSON.stringify({ error: 'runId é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getSupabaseClient();

    const { data: run, error: runError } = await supabase
      .from('flows_runs')
      .select('*')
      .eq('id', runId)
      .maybeSingle();

    if (runError || !run) {
      console.error('Run not found', runError);
      return new Response(JSON.stringify({ error: 'Execução não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: flow, error: flowError } = await supabase
      .from('flows')
      .select('*')
      .eq('id', run.flow_id)
      .maybeSingle();

    if (flowError || !flow) {
      console.error('Flow not found', flowError);
      await supabase
        .from('flows_runs')
        .update({ status: 'failed', finished_at: new Date().toISOString(), logs: [{ level: 'error', message: 'Flow não encontrado' }] })
        .eq('id', runId);

      return new Response(JSON.stringify({ error: 'Flow não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const nodes: Array<any> = Array.isArray(flow.definition?.nodes) ? flow.definition.nodes : [];
    const executionLogs: Array<Record<string, any>> = [];
    const now = new Date().toISOString();
    const leadIdForLog = Number(input?.leadId ?? nodes.find((node) => node?.params?.leadId)?.params?.leadId ?? null) || null;

    await supabase
      .from('flows_runs')
      .update({ status: 'running', started_at: now, logs: executionLogs })
      .eq('id', runId);

    if (leadIdForLog) {
      await supabase.from('actions_log').insert([
        {
          lead_id: leadIdForLog,
          action_label: `Flow ${flow.name} iniciado`,
          status: 'RUNNING',
          payload: { flow_id: flow.id, run_id: runId, input } as any,
          user_id: run.created_by,
        },
      ]);
    }

    let lastOutput: any = input ?? {};

    for (const node of nodes) {
      const nodeLog: Record<string, any> = {
        nodeId: node?.id ?? crypto.randomUUID(),
        type: node?.type ?? 'unknown',
        started_at: new Date().toISOString(),
      };

      try {
        switch (node?.type) {
          case 'delay': {
            const duration = Number(node?.params?.ms ?? node?.params?.duration ?? node?.params?.durationMs ?? 0);
            await wait(duration);
            nodeLog.status = 'success';
            nodeLog.output = { waitedMs: duration };
            break;
          }
          case 'http_call': {
            const url = node?.params?.url ?? node?.params?.endpoint;
            if (!url) {
              throw new Error('URL obrigatória para http_call');
            }
            const result = await execHttpCall({
              url,
              method: node?.params?.method ?? 'GET',
              headers: node?.params?.headers ?? {},
              body: node?.params?.body ?? undefined,
              timeoutMs: node?.params?.timeoutMs ?? undefined,
            });
            nodeLog.status = 'success';
            nodeLog.output = result;
            lastOutput = result;
            break;
          }
          case 'tabular': {
            const leadId = Number(node?.params?.leadId ?? input?.leadId);
            if (!leadId) {
              throw new Error('leadId é obrigatório para nó tabular');
            }
            const actionLabel = node?.params?.actionLabel ?? node?.name ?? flow.name ?? 'Flow';
            const result = await runTabular({
              leadId,
              userId: node?.params?.userId ?? run.created_by ?? null,
              supabaseClient: supabase,
              params: {
                actionLabel,
                field: node?.params?.field ?? input?.field ?? 'STATUS_ID',
                value: node?.params?.value ?? input?.value ?? '',
                webhookUrl: node?.params?.webhookUrl ?? input?.webhookUrl ?? null,
                syncTarget: node?.params?.syncTarget ?? 'bitrix',
                additionalFields: node?.params?.additionalFields ?? input?.additionalFields ?? {},
                selectedValueDisplay: node?.params?.selectedValueDisplay,
                chatwootData: input?.chatwootData ?? null,
                bitrixFields: input?.bitrixFields ?? [],
                metadata: { flow_id: flow.id, node_id: nodeLog.nodeId },
              },
            });

            if (result.status === 'error') {
              throw new Error(result.message);
            }

            nodeLog.status = 'success';
            nodeLog.output = result;
            lastOutput = result;
            break;
          }
          default:
            throw new Error(`Tipo de nó não suportado: ${node?.type}`);
        }
      } catch (nodeError) {
        const message = nodeError instanceof Error ? nodeError.message : String(nodeError);
        nodeLog.status = 'failed';
        nodeLog.error = message;
        executionLogs.push(nodeLog);

        await supabase
          .from('flows_runs')
          .update({
            status: 'failed',
            finished_at: new Date().toISOString(),
            logs: executionLogs,
          })
          .eq('id', runId);

        if (leadIdForLog) {
          await supabase.from('actions_log').insert([
            {
              lead_id: leadIdForLog,
              action_label: `Flow ${flow.name} falhou`,
              status: 'ERROR',
              error: message,
              payload: { flow_id: flow.id, run_id: runId, node: nodeLog } as any,
              user_id: run.created_by,
            },
          ]);
        }

        return new Response(JSON.stringify({ error: message, logs: executionLogs }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      nodeLog.finished_at = new Date().toISOString();
      executionLogs.push(nodeLog);

      await supabase
        .from('flows_runs')
        .update({ logs: executionLogs })
        .eq('id', runId);
    }

    await supabase
      .from('flows_runs')
      .update({
        status: 'success',
        finished_at: new Date().toISOString(),
        logs: executionLogs,
        output: lastOutput ?? null,
      })
      .eq('id', runId);

    if (leadIdForLog) {
      await supabase.from('actions_log').insert([
        {
          lead_id: leadIdForLog,
          action_label: `Flow ${flow.name} concluído`,
          status: 'OK',
          payload: { flow_id: flow.id, run_id: runId, output: lastOutput } as any,
          user_id: run.created_by,
        },
      ]);
    }

    return new Response(JSON.stringify({ status: 'success', output: lastOutput, logs: executionLogs }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro inesperado no executor', error);
    return new Response(JSON.stringify({ error: 'Erro interno no executor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

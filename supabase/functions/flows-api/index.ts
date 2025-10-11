import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-flow-path',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function resolvePath(req: Request) {
  const url = new URL(req.url);
  const headerPath = req.headers.get('x-flow-path');
  if (headerPath) {
    return headerPath.startsWith('/') ? headerPath : `/${headerPath}`;
  }
  const match = url.pathname.split('/flows-api')[1] || '/';
  return match || '/';
}

async function createSupabaseClient(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase credentials are not configured');
  }

  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  const headers: Record<string, string> = {};
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers,
    },
  });
}

async function getUserId(client: ReturnType<typeof createClient>, req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;

  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) {
    console.error('Error retrieving user from token', error);
    return null;
  }

  return data.user.id;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const path = resolvePath(req);
    const supabase = await createSupabaseClient(req);
    const userId = await getUserId(supabase, req);

    if (!userId) {
      return jsonResponse(401, { error: 'Usuário não autenticado' });
    }

    if (req.method === 'POST' && path === '/create') {
      const { name, definition, visibility = 'private' } = await req.json();

      if (!name || !definition) {
        return jsonResponse(400, { error: 'Nome e definição são obrigatórios' });
      }

      const safeVisibility = ['private', 'org', 'public'].includes(visibility)
        ? visibility
        : 'private';

      const { data, error } = await supabase
        .from('flows')
        .insert({
          name,
          definition,
          visibility: safeVisibility,
          created_by: userId,
        })
        .select()
        .single();

      if (error || !data) {
        console.error('Erro ao criar flow', error);
        return jsonResponse(500, { error: 'Erro ao criar flow' });
      }

      return jsonResponse(200, { flow: data });
    }

    if (req.method === 'GET' && path === '/list') {
      const { data, error } = await supabase
        .from('flows')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Erro ao listar flows', error);
        return jsonResponse(500, { error: 'Erro ao listar flows' });
      }

      return jsonResponse(200, { flows: data ?? [] });
    }

    if (req.method === 'GET' && path.startsWith('/')) {
      const flowId = path.slice(1);
      if (flowId) {
        const { data, error } = await supabase
          .from('flows')
          .select('*')
          .eq('id', flowId)
          .maybeSingle();

        if (error) {
          console.error('Erro ao buscar flow', error);
          return jsonResponse(500, { error: 'Erro ao buscar flow' });
        }

        if (!data) {
          return jsonResponse(404, { error: 'Flow não encontrado' });
        }

        return jsonResponse(200, { flow: data });
      }
    }

    if (req.method === 'POST' && path.startsWith('/') && path.endsWith('/execute')) {
      const segments = path.split('/').filter(Boolean);
      if (segments.length === 2 && segments[1] === 'execute') {
        const flowId = segments[0];
        const body = await req.json().catch(() => ({}));
        const input = body?.input ?? body ?? {};

        const { data: flow, error: flowError } = await supabase
          .from('flows')
          .select('*')
          .eq('id', flowId)
          .maybeSingle();

        if (flowError || !flow) {
          console.error('Erro ao buscar flow para execução', flowError);
          return jsonResponse(404, { error: 'Flow não encontrado' });
        }

        const { data: run, error: runError } = await supabase
          .from('flows_runs')
          .insert({
            flow_id: flowId,
            status: 'pending',
            input,
            created_by: userId,
          })
          .select()
          .single();

        if (runError || !run) {
          console.error('Erro ao criar execução', runError);
          return jsonResponse(500, { error: 'Erro ao criar execução' });
        }

        const { error: executorError } = await supabase.functions.invoke('flows-executor', {
          body: {
            runId: run.id,
            input,
          },
        });

        if (executorError) {
          console.error('Erro ao invocar executor', executorError);
          await supabase
            .from('flows_runs')
            .update({
              status: 'failed',
              finished_at: new Date().toISOString(),
              logs: [{ level: 'error', message: executorError.message }],
            })
            .eq('id', run.id);

          return jsonResponse(500, { error: 'Falha ao iniciar executor', run });
        }

        return jsonResponse(200, { run });
      }
    }

    return jsonResponse(404, { error: 'Rota não encontrada' });
  } catch (error) {
    console.error('Erro inesperado no flows-api', error);
    return jsonResponse(500, { error: 'Erro interno no flows-api' });
  }
});

// ============================================
// Flows API - CRUD Operations for Flows
// ============================================
// Edge Function for managing flows (create, read, update, delete, list)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface Flow {
  id?: string;
  nome: string;
  descricao?: string;
  steps: any[];
  ativo?: boolean;
  criado_por?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service_role key for server-side operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get authenticated user from authorization header
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const flowId = pathParts[pathParts.length - 1]; // Last part of path

    // GET - List all flows or get specific flow
    if (req.method === 'GET') {
      if (flowId && flowId !== 'flows-api') {
        // Get specific flow
        const { data, error } = await supabaseAdmin
          .from('flows')
          .select('*')
          .eq('id', flowId)
          .single();

        if (error) {
          console.error('Erro ao buscar flow:', error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // List all flows
        const apenasAtivos = url.searchParams.get('ativo') === 'true';
        
        let query = supabaseAdmin.from('flows').select('*').order('criado_em', { ascending: false });
        
        if (apenasAtivos) {
          query = query.eq('ativo', true);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Erro ao listar flows:', error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ flows: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // POST - Create new flow
    if (req.method === 'POST') {
      const body: Flow = await req.json();

      // Validate required fields
      if (!body.nome || !body.steps || !Array.isArray(body.steps)) {
        return new Response(
          JSON.stringify({ error: 'Nome e steps são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const newFlow = {
        nome: body.nome,
        descricao: body.descricao || null,
        steps: body.steps,
        ativo: body.ativo !== undefined ? body.ativo : true,
        criado_por: userId
      };

      const { data, error } = await supabaseAdmin
        .from('flows')
        .insert([newFlow])
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar flow:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(data),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT - Update existing flow
    if (req.method === 'PUT') {
      const body: Partial<Flow> = await req.json();
      
      // Accept ID from URL path OR request body
      const targetFlowId = (flowId && flowId !== 'flows-api') ? flowId : body.id;
      
      if (!targetFlowId) {
        return new Response(
          JSON.stringify({ error: 'Flow ID é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const updateData: any = {};
      if (body.nome !== undefined) updateData.nome = body.nome;
      if (body.descricao !== undefined) updateData.descricao = body.descricao;
      if (body.steps !== undefined) updateData.steps = body.steps;
      if (body.ativo !== undefined) updateData.ativo = body.ativo;

      const { data, error } = await supabaseAdmin
        .from('flows')
        .update(updateData)
        .eq('id', targetFlowId)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar flow:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE - Delete flow
    if (req.method === 'DELETE') {
      if (!flowId || flowId === 'flows-api') {
        return new Response(
          JSON.stringify({ error: 'Flow ID é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabaseAdmin
        .from('flows')
        .delete()
        .eq('id', flowId);

      if (error) {
        console.error('Erro ao deletar flow:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ message: 'Flow deletado com sucesso' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na flows-api:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

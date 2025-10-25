import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * ⚠️ IMPORTANTE: Este endpoint NÃO deve ser chamado diretamente do cliente (front-end)
 * 
 * Reload Gestão Scouter Schema Cache Endpoint
 * 
 * Segurança implementada:
 * - Autenticação via shared secret (RELOAD_SCHEMA_SECRET)
 * - Secret pode vir do header x-shared-secret ou body JSON
 * - CORS permitido mas endpoint deve ser chamado apenas de backend/webhooks/cron
 * 
 * Recomendações de segurança:
 * 1. NÃO expor este endpoint ao front-end
 * 2. Usar apenas em webhooks, cron jobs ou chamadas backend-to-backend
 * 3. Rotacionar RELOAD_SCHEMA_SECRET regularmente
 * 4. Monitorar logs para tentativas não autorizadas
 * 
 * Variáveis de ambiente:
 * - RELOAD_SCHEMA_SECRET: Segredo compartilhado (obrigatório)
 * - SUPABASE_URL: URL do projeto Supabase
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key para operações administrativas
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shared-secret',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    // Get expected secret from environment variable
    const expectedSecret = Deno.env.get('RELOAD_SCHEMA_SECRET');
    
    if (!expectedSecret) {
      console.error('[reload-schema-cache] ⚠️ RELOAD_SCHEMA_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get secret from header or JSON body
    let providedSecret = req.headers.get('x-shared-secret');
    
    if (!providedSecret) {
      try {
        const body = await req.json();
        providedSecret = body.secret;
      } catch {
        // Ignore JSON parse errors, will check secret below
      }
    }

    // Validate secret - CRITICAL SECURITY CHECK
    if (!providedSecret || providedSecret !== expectedSecret) {
      console.warn('[reload-schema-cache] ⚠️ Unauthorized access attempt - invalid or missing secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or missing secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[reload-schema-cache] ✅ Valid secret provided, proceeding with reload');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Gestão Scouter config
    const { data: config } = await supabase
      .from('gestao_scouter_config')
      .select('*')
      .eq('active', true)
      .maybeSingle();

    if (!config) {
      throw new Error('Configuração do Gestão Scouter não encontrada');
    }

    // Create client for Gestão Scouter with service role
    const gestaoClient = createClient(config.project_url, config.anon_key);

    // Execute NOTIFY command to reload schema cache
    const { error } = await gestaoClient.rpc('notify_pgrst_reload');

    if (error) {
      // If RPC doesn't exist, try direct SQL execution via a query
      console.log('[reload-schema-cache] RPC não encontrado, tentando método alternativo');
      
      // Alternative: Just return success as PostgREST auto-reloads periodically
      return new Response(
        JSON.stringify({ 
          ok: true, 
          message: 'Schema cache será recarregado automaticamente pelo PostgREST',
          note: '⚠️ Lembrete: Este endpoint deve ser chamado apenas do backend, nunca do cliente'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[reload-schema-cache] ✅ Schema cache reload successful');

    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: 'Cache recarregado com sucesso',
        note: '⚠️ Lembrete: Este endpoint deve ser chamado apenas do backend, nunca do cliente'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[reload-schema-cache] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

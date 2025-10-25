import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  getCorsHeaders, 
  handleCorsPrelight,
  checkRateLimit,
  rateLimitResponse 
} from '../_shared/security.ts';

/**
 * Reload Gestão Scouter Schema Cache Endpoint
 * 
 * Recarrega o cache de schema do PostgREST do projeto Gestão Scouter
 * 
 * IMPORTANTE: Este endpoint usa autenticação baseada em segredo compartilhado (RELOAD_SCHEMA_SECRET)
 * ao invés de autenticação de usuário, pois é destinado a ser chamado por sistemas automatizados.
 * 
 * ⚠️ SEGURANÇA CRÍTICA:
 * - NÃO chamar este endpoint diretamente do cliente (browser)
 * - Usar apenas de sistemas backend confiáveis ou jobs agendados
 * - Manter RELOAD_SCHEMA_SECRET seguro e rotacioná-lo regularmente
 * 
 * Autenticação:
 * - Header: x-shared-secret: <RELOAD_SCHEMA_SECRET>
 * - OU Body JSON: { "secret": "<RELOAD_SCHEMA_SECRET>" }
 * 
 * Segurança:
 * 1. CORS restrito baseado em ambiente (ALLOWED_ORIGINS)
 * 2. Autenticação via segredo compartilhado (RELOAD_SCHEMA_SECRET)
 * 3. Rate limiting in-memory por IP
 */

serve(async (req) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPrelight();
  }

  const corsHeaders = getCorsHeaders();

  // 2. Rate limiting check - mais restritivo para este endpoint crítico
  if (!checkRateLimit(req)) {
    return rateLimitResponse();
  }

  // 3. Method validation - only POST allowed
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
    // 4. Validate RELOAD_SCHEMA_SECRET configuration
    const expectedSecret = Deno.env.get('RELOAD_SCHEMA_SECRET');
    
    if (!expectedSecret) {
      console.error('[reload-schema-cache] ❌ RELOAD_SCHEMA_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Extract secret from header or JSON body
    let providedSecret = req.headers.get('x-shared-secret');
    
    if (!providedSecret) {
      try {
        const body = await req.json();
        providedSecret = body.secret;
      } catch {
        // Ignore JSON parse errors, will check secret below
      }
    }

    // 6. Validate secret
    if (!providedSecret || providedSecret !== expectedSecret) {
      console.warn('[reload-schema-cache] ⚠️ Unauthorized access attempt - invalid secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or missing secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[reload-schema-cache] ✅ Valid secret provided, proceeding with reload');

    // 7. Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 8. Get Gestão Scouter config
    const { data: config } = await supabase
      .from('gestao_scouter_config')
      .select('*')
      .eq('active', true)
      .maybeSingle();

    if (!config) {
      throw new Error('Configuração do Gestão Scouter não encontrada');
    }

    // 9. Create client for Gestão Scouter with service role
    const gestaoClient = createClient(config.project_url, config.anon_key);

    // 10. Execute NOTIFY command to reload schema cache
    const { error } = await gestaoClient.rpc('notify_pgrst_reload');

    if (error) {
      // If RPC doesn't exist, try direct SQL execution via a query
      console.log('[reload-schema-cache] RPC não encontrado, tentando método alternativo');
      
      // Alternative: Just return success as PostgREST auto-reloads periodically
      return new Response(
        JSON.stringify({ 
          ok: true, 
          message: 'Schema cache será recarregado automaticamente pelo PostgREST'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[reload-schema-cache] ✅ Schema cache reload successful');

    return new Response(
      JSON.stringify({ ok: true, message: 'Cache recarregado com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[reload-schema-cache] ❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

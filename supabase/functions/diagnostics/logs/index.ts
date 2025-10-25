import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders, verifyAdminAuth, checkRateLimit, errorResponse } from '../../_shared/security.ts';
import { logsQuerySchema, validateData } from '../../_shared/validation.ts';

/**
 * Diagnostics Logs Endpoint
 * 
 * Segurança implementada:
 * - Autenticação via Supabase Auth (JWT token)
 * - Autorização: apenas role='admin'
 * - CORS restrito em produção via ALLOWED_ORIGINS
 * - Rate limiting in-memory por IP (RATE_LIMIT_REQUESTS/min)
 * - Validação de query params com Zod (cursor, level, q)
 * 
 * Variáveis de ambiente:
 * - SUPABASE_URL: URL do projeto Supabase
 * - SUPABASE_ANON_KEY: Anon key para validação de token
 * - ALLOWED_ORIGINS: Lista de origens permitidas (separadas por vírgula) - produção
 * - RATE_LIMIT_REQUESTS: Máximo de requests por minuto por IP (padrão: 60)
 * - NODE_ENV: 'production' para ativar restrições de CORS
 */
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return errorResponse('Method not allowed', 405, corsHeaders);
  }

  // Rate limiting check
  const rateLimitCheck = checkRateLimit(req);
  if (!rateLimitCheck.allowed) {
    return errorResponse('Rate limit exceeded. Try again later.', 429, corsHeaders);
  }

  // Authentication and authorization check
  const authResult = await verifyAdminAuth(req);
  if (!authResult.authorized) {
    return errorResponse(authResult.error || 'Unauthorized', authResult.status || 401, corsHeaders);
  }

  try {
    // Parse and validate query parameters
    const url = new URL(req.url);
    const queryParams = {
      cursor: url.searchParams.get('cursor') || undefined,
      level: url.searchParams.get('level') || undefined,
      q: url.searchParams.get('q') || undefined,
    };

    const validation = validateData(logsQuerySchema, queryParams);
    if (!validation.success) {
      return errorResponse(validation.error, 400, corsHeaders);
    }

    const { cursor, level, q } = validation.data;
    console.log('[diagnostics/logs] Query params validated:', { cursor, level, q });

    // Generate mock log entries
    const logLevels = ['info', 'warn', 'error', 'debug'];
    const messages = [
      'Database query completed successfully',
      'Edge function invoked',
      'Authentication verified',
      'Cache miss, fetching from database',
      'Rate limit check passed',
      'Request processed in 145ms',
      'Connection pool expanded',
      'Webhook delivery attempted',
      'Schema reload triggered',
      'API request to external service',
    ];

    const items = Array.from({ length: 20 }, (_, i) => {
      const timestamp = new Date(Date.now() - i * 60000).toISOString();
      const randomLevel = logLevels[Math.floor(Math.random() * logLevels.length)];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      
      return {
        id: `log-${cursor || 0}-${i}`,
        timestamp,
        level: level === 'all' ? randomLevel : level,
        message: q ? `${randomMessage} [filtered by: ${q}]` : randomMessage,
        function_name: `edge-function-${Math.floor(Math.random() * 5) + 1}`,
        duration_ms: Math.floor(Math.random() * 500) + 50,
      };
    });

    // Generate next cursor for pagination
    const nextCursor = `cursor-${Date.now()}`;

    console.log('[diagnostics/logs] Returning', items.length, 'log entries for admin:', authResult.user?.id);

    return new Response(
      JSON.stringify({ 
        items,
        next_cursor: nextCursor,
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(rateLimitCheck.remaining || 0),
        } 
      }
    );

  } catch (error) {
    console.error('[diagnostics/logs] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(errorMessage, 500, corsHeaders);
  }
});

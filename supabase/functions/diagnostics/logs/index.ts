import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { 
  getCorsHeaders, 
  handleCorsPrelight, 
  checkAuth, 
  unauthorizedResponse, 
  forbiddenResponse,
  checkRateLimit,
  rateLimitResponse 
} from '../../_shared/security.ts';
import { 
  LogsQuerySchema,
  validateQueryParams,
  validationErrorResponse 
} from '../../_shared/validation.ts';

/**
 * Diagnostics Logs Endpoint
 * 
 * Retorna logs do sistema com paginação e filtros
 * 
 * Query params:
 * - cursor: string opcional para paginação
 * - level: 'info' | 'warn' | 'error' | 'debug' | 'all' (default: 'all')
 * - q: string de busca opcional
 * 
 * Segurança:
 * 1. CORS restrito baseado em ambiente (ALLOWED_ORIGINS)
 * 2. Requer autenticação via Supabase Auth
 * 3. Requer role 'admin' para acesso
 * 4. Rate limiting in-memory por IP
 * 5. Validação de query params com Zod
 */

serve(async (req) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPrelight();
  }

  const corsHeaders = getCorsHeaders();

  // 2. Rate limiting check
  if (!checkRateLimit(req)) {
    return rateLimitResponse();
  }

  // 3. Authentication & Authorization check
  const authResult = await checkAuth(req);
  
  if (!authResult.authenticated) {
    console.log('[diagnostics/logs] ⚠️ Unauthenticated request blocked');
    return unauthorizedResponse(authResult.error);
  }

  if (!authResult.isAdmin) {
    console.log(`[diagnostics/logs] 🚫 Non-admin user ${authResult.userId} blocked`);
    return forbiddenResponse();
  }

  // 4. Method validation - only GET allowed
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const url = new URL(req.url);
    
    // 5. Validate query parameters with Zod
    const validation = validateQueryParams(url, LogsQuerySchema);
    
    if (!validation.success) {
      console.log('[diagnostics/logs] ⚠️ Invalid query params:', validation.error);
      return validationErrorResponse(validation.error, corsHeaders);
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

    console.log(`[diagnostics/logs] ✅ Returning ${items.length} log entries for admin user ${authResult.userId}`);

    return new Response(
      JSON.stringify({ 
        items,
        next_cursor: nextCursor,
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('[diagnostics/logs] ❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

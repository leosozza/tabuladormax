import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders, verifyAdminAuth, checkRateLimit, errorResponse } from '../../_shared/security.ts';

/**
 * Diagnostics Health Endpoint
 * 
 * Segurança implementada:
 * - Autenticação via Supabase Auth (JWT token)
 * - Autorização: apenas role='admin'
 * - CORS restrito em produção via ALLOWED_ORIGINS
 * - Rate limiting in-memory por IP (RATE_LIMIT_REQUESTS/min)
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
    // Generate mock health checks
    const healthChecks = [
      {
        name: 'Database',
        status: Math.random() > 0.1 ? 'healthy' : 'degraded',
        latency_ms: Math.floor(Math.random() * 50) + 10,
        description: 'PostgreSQL connection pool status',
      },
      {
        name: 'Edge Functions',
        status: Math.random() > 0.05 ? 'healthy' : 'unhealthy',
        latency_ms: Math.floor(Math.random() * 30) + 5,
        description: 'Deno runtime and function execution',
      },
      {
        name: 'Storage',
        status: Math.random() > 0.08 ? 'healthy' : 'degraded',
        latency_ms: Math.floor(Math.random() * 100) + 20,
        description: 'Object storage availability',
      },
      {
        name: 'Auth Service',
        status: Math.random() > 0.05 ? 'healthy' : 'unhealthy',
        latency_ms: Math.floor(Math.random() * 40) + 15,
        description: 'Authentication and session management',
      },
      {
        name: 'PostgREST API',
        status: Math.random() > 0.07 ? 'healthy' : 'degraded',
        latency_ms: Math.floor(Math.random() * 60) + 25,
        description: 'REST API layer performance',
      },
    ];

    console.log('[diagnostics/health] Health checks generated for admin:', authResult.user?.id);

    return new Response(
      JSON.stringify(healthChecks),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(rateLimitCheck.remaining || 0),
        } 
      }
    );

  } catch (error) {
    console.error('[diagnostics/health] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(errorMessage, 500, corsHeaders);
  }
});

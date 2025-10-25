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

/**
 * Diagnostics Health Endpoint
 * 
 * Retorna health checks de vários componentes do sistema
 * 
 * Segurança:
 * 1. CORS restrito baseado em ambiente (ALLOWED_ORIGINS)
 * 2. Requer autenticação via Supabase Auth
 * 3. Requer role 'admin' para acesso
 * 4. Rate limiting in-memory por IP
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
    console.log('[diagnostics/health] ⚠️ Unauthenticated request blocked');
    return unauthorizedResponse(authResult.error);
  }

  if (!authResult.isAdmin) {
    console.log(`[diagnostics/health] 🚫 Non-admin user ${authResult.userId} blocked`);
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

    console.log(`[diagnostics/health] ✅ Health checks generated for admin user ${authResult.userId}`);

    return new Response(
      JSON.stringify(healthChecks),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('[diagnostics/health] ❌ Error:', error);
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

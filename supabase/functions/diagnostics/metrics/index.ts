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
 * Diagnostics Metrics Endpoint
 * 
 * Retorna métricas do sistema (requests/s, latência, taxa de erro, conexões DB)
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
    console.log('[diagnostics/metrics] ⚠️ Unauthenticated request blocked');
    return unauthorizedResponse(authResult.error);
  }

  if (!authResult.isAdmin) {
    console.log(`[diagnostics/metrics] 🚫 Non-admin user ${authResult.userId} blocked`);
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
    // Generate mock metrics data
    const snapshot = {
      req_per_s: Math.floor(Math.random() * 50) + 10, // 10-60 req/s
      latency_p95_ms: Math.floor(Math.random() * 200) + 50, // 50-250ms
      error_rate_pct: (Math.random() * 2).toFixed(2), // 0-2%
      db_connections: Math.floor(Math.random() * 20) + 5, // 5-25 connections
    };

    console.log(`[diagnostics/metrics] ✅ Metrics generated for admin user ${authResult.userId}`);

    return new Response(
      JSON.stringify({ snapshot }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('[diagnostics/metrics] ❌ Error:', error);
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

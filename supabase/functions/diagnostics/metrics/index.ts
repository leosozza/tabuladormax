import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders, verifyAdminAuth, checkRateLimit, errorResponse } from '../../_shared/security.ts';

/**
 * Diagnostics Metrics Endpoint
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
    // Generate mock metrics data
    const snapshot = {
      req_per_s: Math.floor(Math.random() * 50) + 10, // 10-60 req/s
      latency_p95_ms: Math.floor(Math.random() * 200) + 50, // 50-250ms
      error_rate_pct: (Math.random() * 2).toFixed(2), // 0-2%
      db_connections: Math.floor(Math.random() * 20) + 5, // 5-25 connections
    };

    console.log('[diagnostics/metrics] Generated snapshot for admin:', authResult.user?.id);

    return new Response(
      JSON.stringify({ snapshot }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(rateLimitCheck.remaining || 0),
        } 
      }
    );

  } catch (error) {
    console.error('[diagnostics/metrics] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(errorMessage, 500, corsHeaders);
  }
});

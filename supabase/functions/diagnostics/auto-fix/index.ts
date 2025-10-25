import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders, verifyAdminAuth, checkRateLimit, errorResponse } from '../../_shared/security.ts';
import { autoFixBodySchema, validateData } from '../../_shared/validation.ts';

/**
 * Diagnostics Auto-Fix Endpoint
 * 
 * Segurança implementada:
 * - Autenticação via Supabase Auth (JWT token)
 * - Autorização: apenas role='admin'
 * - CORS restrito em produção via ALLOWED_ORIGINS
 * - Rate limiting in-memory por IP (RATE_LIMIT_REQUESTS/min)
 * - Validação de body POST com Zod (issueId, action)
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

  // Only allow POST requests
  if (req.method !== 'POST') {
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
    // Parse and validate request body
    const body = await req.json();
    const validation = validateData(autoFixBodySchema, body);
    
    if (!validation.success) {
      return errorResponse(validation.error, 400, corsHeaders);
    }

    const { issueId, action } = validation.data;
    console.log(`[diagnostics/auto-fix] Validated request for issue ${issueId}, action: ${action || 'default'}`);

    // Generate a mock job ID
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    console.log(`[diagnostics/auto-fix] Auto-fix initiated for issue ${issueId} by admin ${authResult.user?.id}, job: ${jobId}`);

    // Simulate async job kickoff
    // In a real implementation, this would dispatch to a background worker
    // or queue system to perform the actual fix

    return new Response(
      JSON.stringify({ 
        ok: true,
        message: `Auto-fix job initiated for issue ${issueId}`,
        jobId,
        estimatedDuration: '2-5 minutes',
        action: action || 'default',
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
    console.error('[diagnostics/auto-fix] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        ok: false,
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(rateLimitCheck.remaining || 0),
        } 
      }
    );
  }
});

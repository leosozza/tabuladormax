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
  AutoFixRequestSchema,
  validateRequestBody,
  validationErrorResponse 
} from '../../_shared/validation.ts';

/**
 * Diagnostics Auto-Fix Endpoint
 * 
 * Inicia job de auto-correção para um issue específico
 * 
 * Body (JSON):
 * - issueId: string (required) - ID do issue a ser corrigido
 * 
 * Segurança:
 * 1. CORS restrito baseado em ambiente (ALLOWED_ORIGINS)
 * 2. Requer autenticação via Supabase Auth
 * 3. Requer role 'admin' para acesso
 * 4. Rate limiting in-memory por IP
 * 5. Validação de request body com Zod
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
    console.log('[diagnostics/auto-fix] ⚠️ Unauthenticated request blocked');
    return unauthorizedResponse(authResult.error);
  }

  if (!authResult.isAdmin) {
    console.log(`[diagnostics/auto-fix] 🚫 Non-admin user ${authResult.userId} blocked`);
    return forbiddenResponse();
  }

  // 4. Method validation - only POST allowed
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
    // 5. Validate request body with Zod
    const validation = await validateRequestBody(req, AutoFixRequestSchema);
    
    if (!validation.success) {
      console.log('[diagnostics/auto-fix] ⚠️ Invalid request body:', validation.error);
      return validationErrorResponse(validation.error, corsHeaders);
    }
    
    const { issueId } = validation.data;

    // Generate a mock job ID
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    console.log(`[diagnostics/auto-fix] ✅ Auto-fix initiated by admin ${authResult.userId} for issue ${issueId}, job: ${jobId}`);

    // Simulate async job kickoff
    // In a real implementation, this would dispatch to a background worker
    // or queue system to perform the actual fix

    return new Response(
      JSON.stringify({ 
        ok: true,
        message: `Auto-fix job initiated for issue ${issueId}`,
        jobId,
        estimatedDuration: '2-5 minutes',
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('[diagnostics/auto-fix] ❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        ok: false,
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

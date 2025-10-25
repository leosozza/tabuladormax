/**
 * Shared utilities for Edge Functions security hardening
 * 
 * Implementa camadas de segurança:
 * 1. CORS restrito baseado em ambiente
 * 2. Autenticação via Supabase Auth
 * 3. Autorização baseada em role (admin)
 * 4. Rate limiting in-memory simples por IP
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// CORS Configuration
// ============================================================================

/**
 * Retorna headers CORS apropriados baseado no ambiente
 * 
 * Segurança:
 * - Desenvolvimento: Permite '*' para facilitar desenvolvimento local
 * - Produção: Usa ALLOWED_ORIGINS da variável de ambiente (separado por vírgula)
 * - Fallback: Se não configurado em produção, bloqueia todas as origens
 */
export function getCorsHeaders(): Record<string, string> {
  const isDevelopment = Deno.env.get('NODE_ENV') !== 'production';
  
  if (isDevelopment) {
    // Desenvolvimento: permite todas as origens
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };
  }

  // Produção: usa lista de origens permitidas da variável de ambiente
  const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS') || '';
  const origins = allowedOrigins.split(',').map(o => o.trim()).filter(Boolean);
  
  // Se não há origens configuradas, não permite nenhuma (segurança máxima)
  if (origins.length === 0) {
    console.warn('[CORS] ⚠️ ALLOWED_ORIGINS não configurada em produção - bloqueando CORS');
    return {
      'Access-Control-Allow-Origin': 'null',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };
  }

  // TODO: Em produção real, deve-se validar a origem do request
  // Por enquanto, retorna a primeira origem configurada
  return {
    'Access-Control-Allow-Origin': origins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}

/**
 * Handler para requisições OPTIONS (CORS preflight)
 */
export function handleCorsPrelight(): Response {
  return new Response(null, { 
    headers: getCorsHeaders(),
    status: 204,
  });
}

// ============================================================================
// Authentication & Authorization
// ============================================================================

export interface AuthResult {
  authenticated: boolean;
  isAdmin: boolean;
  userId?: string;
  error?: string;
}

/**
 * Verifica autenticação e autorização do usuário
 * 
 * Segurança:
 * 1. Extrai JWT do header Authorization
 * 2. Valida token com Supabase Auth
 * 3. Busca role do usuário na tabela user_profiles
 * 4. Retorna se o usuário é admin
 */
export async function checkAuth(req: Request): Promise<AuthResult> {
  try {
    // 1. Extrair token do header Authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return { 
        authenticated: false, 
        isAdmin: false,
        error: 'Missing authorization header' 
      };
    }

    // 2. Validar formato do token
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return { 
        authenticated: false, 
        isAdmin: false,
        error: 'Invalid token format' 
      };
    }

    // 3. Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[Auth] ❌ Supabase environment variables not configured');
      return { 
        authenticated: false, 
        isAdmin: false,
        error: 'Server configuration error' 
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // 4. Verificar usuário autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('[Auth] ⚠️ User not authenticated:', userError?.message);
      return { 
        authenticated: false, 
        isAdmin: false,
        error: 'Invalid or expired token' 
      };
    }

    // 5. Buscar role do usuário
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[Auth] ❌ Error fetching user profile:', profileError);
      return { 
        authenticated: true, 
        isAdmin: false,
        userId: user.id,
        error: 'Error fetching user role' 
      };
    }

    const isAdmin = profile?.role === 'admin';
    
    console.log(`[Auth] ✅ User ${user.id} authenticated with role: ${profile?.role}`);
    
    return { 
      authenticated: true, 
      isAdmin,
      userId: user.id 
    };

  } catch (error) {
    console.error('[Auth] ❌ Unexpected error:', error);
    return { 
      authenticated: false, 
      isAdmin: false,
      error: 'Authentication error' 
    };
  }
}

/**
 * Retorna resposta de erro de autenticação
 */
export function unauthorizedResponse(message = 'Unauthorized'): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status: 401,
      headers: { 
        ...getCorsHeaders(),
        'Content-Type': 'application/json' 
      }
    }
  );
}

/**
 * Retorna resposta de erro de autorização (forbidden)
 */
export function forbiddenResponse(message = 'Forbidden: Admin access required'): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status: 403,
      headers: { 
        ...getCorsHeaders(),
        'Content-Type': 'application/json' 
      }
    }
  );
}

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Rate Limiter in-memory simples
 * 
 * NOTA: Esta é uma implementação básica para demonstração.
 * Em produção, recomenda-se usar um serviço externo como:
 * - Redis com sliding window
 * - Upstash Rate Limiting
 * - Cloudflare Rate Limiting
 * 
 * Limitações:
 * - Estado não é compartilhado entre instâncias da edge function
 * - Perde estado ao reiniciar a função
 * - Não é distribuído
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup periodicamente (a cada 5 minutos)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Extrai IP do request
 * Considera headers de proxy (X-Forwarded-For, X-Real-IP)
 */
function getClientIp(req: Request): string {
  // Tentar headers de proxy primeiro
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback: usar URL do request (menos confiável)
  return 'unknown';
}

/**
 * Verifica rate limit para um cliente
 * 
 * @param req Request object
 * @returns true se permitido, false se excedeu o limite
 */
export function checkRateLimit(req: Request): boolean {
  // Ler configuração de rate limit (requests por minuto)
  const rateLimitStr = Deno.env.get('RATE_LIMIT_REQUESTS') || '60';
  const maxRequests = parseInt(rateLimitStr, 10);
  
  const clientIp = getClientIp(req);
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minuto
  
  const entry = rateLimitStore.get(clientIp);
  
  if (!entry || entry.resetTime < now) {
    // Primeira requisição ou janela expirou - criar nova entrada
    rateLimitStore.set(clientIp, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }
  
  if (entry.count >= maxRequests) {
    console.warn(`[RateLimit] ⚠️ IP ${clientIp} excedeu rate limit: ${entry.count}/${maxRequests}`);
    return false;
  }
  
  // Incrementar contador
  entry.count++;
  return true;
}

/**
 * Retorna resposta de rate limit excedido
 */
export function rateLimitResponse(): Response {
  return new Response(
    JSON.stringify({ 
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.'
    }),
    { 
      status: 429,
      headers: { 
        ...getCorsHeaders(),
        'Content-Type': 'application/json',
        'Retry-After': '60',
      }
    }
  );
}

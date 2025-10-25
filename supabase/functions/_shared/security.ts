/**
 * Shared utilities for Edge Functions
 * Hardening: Auth, CORS, Rate Limiting
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Configuração de CORS com restrição por ambiente
 * Em produção: usa ALLOWED_ORIGINS (lista separada por vírgula)
 * Em desenvolvimento: permite '*' para facilitar testes locais
 */
export function getCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get('origin');
  const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS') || '';
  const isDevelopment = Deno.env.get('NODE_ENV') !== 'production';
  
  // Em desenvolvimento, permite qualquer origem
  if (isDevelopment) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };
  }
  
  // Em produção, valida contra lista de origens permitidas
  const allowedList = allowedOrigins.split(',').map(o => o.trim()).filter(Boolean);
  
  if (origin && allowedList.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Credentials': 'true',
    };
  }
  
  // Origem não permitida em produção
  return {
    'Access-Control-Allow-Origin': 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

/**
 * Verificação de autenticação e autorização
 * Valida JWT token e verifica se usuário tem role 'admin'
 * 
 * @returns User object se autenticado e autorizado, null caso contrário
 */
export async function verifyAdminAuth(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return { authorized: false, error: 'Missing authorization header', status: 401 };
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[Auth] Supabase env vars not configured');
      return { authorized: false, error: 'Server configuration error', status: 500 };
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    // Verificar sessão/token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.warn('[Auth] Invalid token:', authError?.message);
      return { authorized: false, error: 'Unauthorized', status: 401 };
    }

    // Verificar role do usuário na tabela user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[Auth] Error fetching user profile:', profileError?.message);
      return { authorized: false, error: 'Error verifying permissions', status: 403 };
    }

    // Apenas admins têm acesso
    if (profile.role !== 'admin') {
      console.warn('[Auth] Non-admin user attempted access:', user.id, 'role:', profile.role);
      return { authorized: false, error: 'Forbidden: Admin access required', status: 403 };
    }

    console.log('[Auth] Admin access granted:', user.id);
    return { authorized: true, user, profile };
    
  } catch (error) {
    console.error('[Auth] Exception during auth check:', error);
    return { authorized: false, error: 'Authentication error', status: 500 };
  }
}

/**
 * Rate Limiter in-memory simples
 * NOTA: Este é um rate limiter básico para demonstração
 * Em produção, recomenda-se usar serviço externo (Redis, Upstash, etc)
 * 
 * Funciona por IP, janela de tempo de 1 minuto
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Limpar entradas antigas a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export function checkRateLimit(req: Request): { allowed: boolean; remaining?: number } {
  // Obter IP do cliente (pode vir de vários headers dependendo do proxy)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() 
    || req.headers.get('x-real-ip') 
    || 'unknown';
  
  const limit = parseInt(Deno.env.get('RATE_LIMIT_REQUESTS') || '60', 10);
  const windowMs = 60 * 1000; // 1 minuto
  const now = Date.now();
  
  let entry = rateLimitStore.get(ip);
  
  // Nova entrada ou janela expirada
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(ip, entry);
    return { allowed: true, remaining: limit - 1 };
  }
  
  // Incrementar contador
  entry.count++;
  
  if (entry.count > limit) {
    console.warn(`[RateLimit] IP ${ip} exceeded limit: ${entry.count}/${limit}`);
    return { allowed: false };
  }
  
  return { allowed: true, remaining: limit - entry.count };
}

/**
 * Helper para retornar resposta de erro padronizada
 */
export function errorResponse(
  error: string, 
  status: number, 
  corsHeaders: HeadersInit
): Response {
  return new Response(
    JSON.stringify({ error }),
    { 
      status, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      } 
    }
  );
}

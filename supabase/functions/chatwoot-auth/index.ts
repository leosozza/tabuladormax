import { createClient, type Session } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AssigneeData {
  email: string;
  name: string;
  role: string; // 'administrator' | 'agent'
}

interface UserMetadata {
  display_name: string;
  chatwoot_email: string;
  chatwoot_role: string;
  chatwoot_id?: number;
}

function jsonResponse(body: any, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    }
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const start = performance.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variáveis SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes');
    }

    let payload: AssigneeData;
    try {
      payload = await req.json();
    } catch {
      throw new Error('JSON inválido');
    }

    const { email, name, role } = payload;
    if (!email || !name) {
      throw new Error('Email e nome são obrigatórios');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log('📧 Iniciando auto-login:', { email, name, role });

    const userMetadata: UserMetadata = {
      display_name: name,
      chatwoot_email: email,
      chatwoot_role: role,
    };

    // 1. Buscar usuário por e-mail usando listUsers com filtro
    const { data: listData, error: getUserErr } = await supabaseAdmin.auth.admin.listUsers();
    if (getUserErr) {
      console.error('Erro listUsers:', getUserErr);
      throw getUserErr;
    }

    let userId: string;
    const existingUser = listData?.users?.find(u => u.email === email);

    if (existingUser) {
      userId = existingUser.id;
      console.log('✅ Usuário existente:', userId);
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: userMetadata
      });
      if (updErr) {
        console.warn('⚠️ Falha ao atualizar metadata (seguindo fluxo):', updErr);
      } else {
        console.log('✅ Metadata atualizada');
      }
    } else {
      const randomPassword = crypto.randomUUID();
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: userMetadata,
      });
      if (createErr) {
        console.error('Erro createUser:', createErr);
        throw createErr;
      }
      userId = newUser.user.id;
      console.log('✅ Novo usuário criado:', userId);
    }

    // 2. Mapear role
    const appRole = role === 'administrator' ? 'admin' : 'agent';

    // 3. Upsert de role (evita 23505)
    const { error: roleErr } = await supabaseAdmin
      .from('user_roles')
      .upsert({ user_id: userId, role: appRole }, { onConflict: 'user_id,role', ignoreDuplicates: true });

    if (roleErr) {
      // Duplicates should be handled by ignoreDuplicates, so any error here is unexpected
      console.error('Erro inesperado ao garantir role:', roleErr);
      throw roleErr;
    }
    console.log('✅ Role garantida:', appRole);

    // 4. Gerar magic link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: 'https://tabuladormax.lovable.app' }
    });
    if (linkError) {
      console.error('Erro generateLink:', linkError);
      throw linkError;
    }

    const actionLink = linkData.properties.action_link;
    console.log('🔗 Action link:', actionLink);

    // 5. Extrair token (OTP) da query
    const url = new URL(actionLink);
    const otpToken = url.searchParams.get('token');
    if (!otpToken) {
      throw new Error('Token do magic link não encontrado na URL');
    }

    // 6. Trocar token por sessão (principal correção)
    const { data: verifyData, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
      email,
      token: otpToken,
      type: 'magiclink',
    });
    if (verifyError) {
      console.error('Erro verifyOtp:', verifyError);
      throw verifyError;
    }
    if (!verifyData?.session) {
      console.error('verifyOtp não retornou sessão');
      throw new Error('Falha ao verificar magic link');
    }

    const session: Session = verifyData.session;
    console.log('✅ Sessão via verifyOtp:', {
      hasAccess: !!session.access_token,
      hasRefresh: !!session.refresh_token,
      expiresIn: session.expires_in
    });

    const durationMs = Math.round(performance.now() - start);

    return jsonResponse({
      success: true,
      mode: 'server-exchange',
      duration_ms: durationMs,
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        token_type: session.token_type
      },
      user: {
        id: session.user.id,
        email: session.user.email,
        role: appRole,
        metadata: session.user.user_metadata
      }
    });
  } catch (err: any) {
    const msg = err?.message ?? 'Erro desconhecido';
    console.error('❌ Erro auto-login:', err);
    return jsonResponse({ success: false, error: msg }, { status: 500 });
  }
});

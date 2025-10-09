import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AssigneeData {
  email: string;
  name: string;
  role: string; // 'administrator' ou 'agent'
}

interface UserMetadata {
  display_name: string;
  chatwoot_email: string;
  chatwoot_role: string;
  chatwoot_id?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { email, name, role }: AssigneeData = await req.json();
    
    console.log('📧 Processando auto-login para:', { email, name, role });

    if (!email || !name) {
      throw new Error('Email e nome são obrigatórios');
    }

    // Buscar ou criar usuário
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Erro ao listar usuários:', listError);
      throw listError;
    }

    // Preparar metadata do usuário
    const userMetadata: UserMetadata = {
      display_name: name,
      chatwoot_email: email,
      chatwoot_role: role,
    };

    let userId: string;
    const existingUser = existingUsers.users.find(u => u.email === email);

    if (existingUser) {
      userId = existingUser.id;
      console.log('✅ Usuário existente encontrado:', userId);
      
      // Atualizar metadata do usuário existente
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { user_metadata: userMetadata }
      );
      
      if (updateError) {
        console.error('Erro ao atualizar metadata:', updateError);
      } else {
        console.log('✅ Metadata do usuário atualizado');
      }
    } else {
      // Criar novo usuário com senha aleatória
      const randomPassword = crypto.randomUUID();
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: userMetadata
      });

      if (createError) {
        console.error('Erro ao criar usuário:', createError);
        throw createError;
      }

      userId = newUser.user.id;
      console.log('✅ Novo usuário criado:', userId);
    }

    // Mapear role do Chatwoot para role do Supabase
    const appRole = role === 'administrator' ? 'admin' : 'agent';
    
    // Verificar se já tem a role
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('role', appRole)
      .single();

    if (!existingRole) {
      // Inserir role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: userId, role: appRole });

      if (roleError) {
        console.error('Erro ao inserir role:', roleError);
        throw roleError;
      }
      console.log('✅ Role atribuída:', appRole);
    }

    // Gerar link mágico para o usuário
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (linkError) {
      console.error('Erro ao gerar link:', linkError);
      throw linkError;
    }

    console.log('✅ Link de acesso gerado com sucesso');

    // Extrair tokens do action_link
    const actionLink = linkData.properties.action_link;
    console.log('🔗 Action link gerado:', actionLink);

    // Parsear URL para extrair tokens do hash
    const url = new URL(actionLink);
    const hashParams = new URLSearchParams(url.hash.substring(1));

    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const expiresIn = hashParams.get('expires_in');

    console.log('🔑 Tokens extraídos:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      expiresIn
    });

    if (!accessToken || !refreshToken) {
      console.error('❌ Tokens não encontrados no magic link');
      throw new Error('Tokens de autenticação não encontrados no magic link');
    }

    // Construir objeto de sessão completo
    const sessionData = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: parseInt(expiresIn || '3600'),
      token_type: 'bearer',
      user: {
        id: userId,
        email,
        user_metadata: userMetadata,
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      }
    };

    console.log('✅ Sessão completa preparada:', {
      userId,
      email,
      hasTokens: true
    });

    return new Response(
      JSON.stringify({
        success: true,
        session: sessionData,
        user: {
          id: userId,
          email,
          name,
          role: appRole,
          metadata: userMetadata
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Erro no auto-login:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

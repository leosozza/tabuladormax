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

    let userId: string;
    const existingUser = existingUsers.users.find(u => u.email === email);

    if (existingUser) {
      userId = existingUser.id;
      console.log('✅ Usuário existente encontrado:', userId);
    } else {
      // Criar novo usuário com senha aleatória
      const randomPassword = crypto.randomUUID();
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          display_name: name
        }
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

    return new Response(
      JSON.stringify({
        success: true,
        redirect_url: linkData.properties.action_link,
        user: {
          id: userId,
          email,
          name,
          role: appRole
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

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verificar autenticação do usuário que está fazendo a request
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let requestUserId: string | null = null;

    try {
      const token = authHeader.replace('Bearer ', '').trim();
      const payload = JSON.parse(atob(token.split('.')[1]));
      requestUserId = payload.sub as string | null;
      console.log('[create-supervisor-user] Authenticated user id from JWT:', requestUserId);
    } catch (e) {
      console.error('[create-supervisor-user] Error parsing JWT:', e);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!requestUserId) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é admin, manager ou supervisor
    const { data: roleData, error: roleCheckError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestUserId)
      .single();

    console.log('[create-supervisor-user] User role:', roleData?.role, 'error:', roleCheckError);

    if (roleCheckError) {
      console.error('[create-supervisor-user] Error fetching user role:', roleCheckError);
    }

    // Permitir admin, manager E supervisor
    if (!roleData || !['admin', 'manager', 'supervisor'].includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores, gerentes e supervisores podem criar usuários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const creatorRole = roleData.role;

    let { 
      email, 
      password, 
      displayName, 
      role, 
      department,
      projectId,
      supervisorId,
      telemarketingId,
      telemarketingName,
      cargoId, // Cargo do Bitrix: 10620=Supervisor, 10626=Supervisor Adj, 10627=Control Desk
    } = await req.json();

    // Mapear roles especiais para cargo_id se não fornecido
    if (!cargoId) {
      if (role === 'supervisor_adjunto') {
        cargoId = '10626';
        role = 'supervisor'; // No banco, todos os supervisores usam 'supervisor'
      } else if (role === 'control_desk') {
        cargoId = '10627';
        role = 'supervisor'; // Control Desk também tem acesso de supervisor
      } else if (role === 'supervisor') {
        cargoId = '10620';
      }
    }

    // Se é supervisor criando, aplicar restrições
    if (creatorRole === 'supervisor') {
      // Supervisores só podem criar supervisores, adjuntos, control desk ou agents
      const allowedRoles = ['supervisor', 'supervisor_adjunto', 'control_desk', 'agent'];
      if (!allowedRoles.includes(role)) {
        return new Response(
          JSON.stringify({ error: 'Supervisores só podem criar supervisores, adjuntos ou agentes' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Forçar departamento telemarketing
      department = 'telemarketing';

      // Buscar o projeto do supervisor que está criando
      const { data: creatorMapping } = await supabaseAdmin
        .from('agent_telemarketing_mapping')
        .select('commercial_project_id')
        .eq('tabuladormax_user_id', requestUserId)
        .single();

      if (creatorMapping?.commercial_project_id) {
        // Forçar o mesmo projeto do supervisor criador
        projectId = creatorMapping.commercial_project_id;
        console.log('[create-supervisor-user] Supervisor forcing project:', projectId);
      }

      // Se está criando agent ou adjunto, forçar o supervisor criador como supervisor
      if (role === 'agent' || role === 'supervisor_adjunto' || role === 'control_desk') {
        supervisorId = requestUserId;
        console.log('[create-supervisor-user] Setting supervisorId:', supervisorId);
      }
    }

    console.log('[create-supervisor-user] Creating user:', { 
      email, 
      role, 
      department, 
      projectId, 
      supervisorId, 
      telemarketingId,
      cargoId,
      creatorRole
    });

    // Criar usuário usando Admin API
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName || email.split('@')[0],
        password_reset_required: true,
      }
    });

    if (createError) {
      console.error('[create-supervisor-user] Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;
    console.log('[create-supervisor-user] User created:', userId);

    // Aguardar um pouco para o trigger executar
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Inserir/atualizar profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        display_name: displayName || email.split('@')[0],
      });

    if (profileError) {
      console.error('[create-supervisor-user] Error updating profile:', profileError);
    }

    // Inserir/atualizar role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({ 
        user_id: userId, 
        role: role || 'agent'
      });

    if (roleError) {
      console.error('[create-supervisor-user] Error updating role:', roleError);
    }

    // Inserir/atualizar departamento
    const { error: deptError } = await supabaseAdmin
      .from('user_departments')
      .upsert({ 
        user_id: userId, 
        department: department || 'telemarketing'
      });

    if (deptError) {
      console.error('[create-supervisor-user] Error updating department:', deptError);
    }

    // Criar mapeamento de telemarketing se necessário
    if ((role === 'supervisor' || role === 'agent') && projectId) {
      const mappingData: any = {
        tabuladormax_user_id: userId,
        bitrix_telemarketing_id: telemarketingId || 0,
        bitrix_telemarketing_name: telemarketingName || displayName || email.split('@')[0],
        commercial_project_id: projectId,
        cargo_id: cargoId || null, // Cargo do Bitrix
      };

      // Se for agent ou adjunto/control desk, incluir supervisor_id
      if ((role === 'agent' || cargoId === '10626' || cargoId === '10627') && supervisorId) {
        mappingData.supervisor_id = supervisorId;
      } else {
        // Se for supervisor principal, não tem supervisor
        mappingData.supervisor_id = null;
      }

      const { error: mappingError } = await supabaseAdmin
        .from('agent_telemarketing_mapping')
        .insert(mappingData);

      if (mappingError) {
        console.error('[create-supervisor-user] Error creating telemarketing mapping:', mappingError);
      } else {
        console.log('[create-supervisor-user] Telemarketing mapping created');
      }
    }

    console.log('[create-supervisor-user] User fully configured');

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: userId,
          email: userData.user.email,
          role: role || 'agent',
          department: department || 'telemarketing'
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[create-supervisor-user] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

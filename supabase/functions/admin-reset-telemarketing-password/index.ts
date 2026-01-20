import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { bitrix_id, new_password } = await req.json();

    if (!bitrix_id || !new_password) {
      return new Response(
        JSON.stringify({ error: 'bitrix_id and new_password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[AdminReset] Resetting password for bitrix_id: ${bitrix_id}`);

    // Buscar email do operador no mapping
    const { data: mapping } = await supabaseAdmin
      .from('agent_telemarketing_mapping')
      .select('tabuladormax_user_id, bitrix_telemarketing_name')
      .eq('bitrix_telemarketing_id', bitrix_id)
      .maybeSingle();

    // Email padrão para operadores de telemarketing
    const email = `tele-${bitrix_id}@maxfama.internal`;

    // Verificar se existe usuário com esse email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('[AdminReset] Error listing users:', listError);
      throw listError;
    }

    const existingUser = users?.find(u => u.email === email);

    if (existingUser) {
      // Atualizar senha do usuário existente
      console.log(`[AdminReset] User found, updating password for: ${email}`);
      
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password: new_password }
      );

      if (updateError) {
        console.error('[AdminReset] Error updating password:', updateError);
        throw updateError;
      }

      // Atualizar mapping se necessário
      if (!mapping?.tabuladormax_user_id) {
        await supabaseAdmin
          .from('agent_telemarketing_mapping')
          .update({ tabuladormax_user_id: existingUser.id })
          .eq('bitrix_telemarketing_id', bitrix_id);
      }

      console.log(`[AdminReset] Password updated successfully for: ${email}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Password updated',
          user_id: existingUser.id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Criar novo usuário
      console.log(`[AdminReset] User not found, creating: ${email}`);
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: new_password,
        email_confirm: true,
        user_metadata: {
          bitrix_id,
          role: 'telemarketing_operator'
        }
      });

      if (createError) {
        console.error('[AdminReset] Error creating user:', createError);
        throw createError;
      }

      // Atualizar mapping
      if (newUser?.user) {
        await supabaseAdmin
          .from('agent_telemarketing_mapping')
          .update({ tabuladormax_user_id: newUser.user.id })
          .eq('bitrix_telemarketing_id', bitrix_id);
      }

      console.log(`[AdminReset] User created successfully: ${email}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'User created',
          user_id: newUser?.user?.id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[AdminReset] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

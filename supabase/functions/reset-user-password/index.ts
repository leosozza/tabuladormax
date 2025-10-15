import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      throw new Error("userId é obrigatório");
    }

    // Criar cliente Supabase com service role para operações admin
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Gerar senha temporária aleatória (8 caracteres)
    const tempPassword = generatePassword();

    // Atualizar senha do usuário usando Admin API
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { 
        password: tempPassword,
        // Forçar usuário a mudar senha no próximo login
        user_metadata: { 
          password_reset_required: true,
          temp_password_created_at: new Date().toISOString()
        }
      }
    );

    if (updateError) {
      console.error("Erro ao resetar senha:", updateError);
      throw updateError;
    }

    console.log(`✅ Senha temporária gerada para usuário ${userId}`);

    // Sincronizar senha com Chatwoot
    try {
      const { data: mappingData, error: mappingError } = await supabaseAdmin
        .from('agent_telemarketing_mapping')
        .select('chatwoot_agent_id')
        .eq('tabuladormax_user_id', userId)
        .maybeSingle();
      
      if (mappingError) {
        console.warn('⚠️ Erro ao buscar mapeamento:', mappingError);
      }
      
      if (mappingData?.chatwoot_agent_id) {
        console.log('📝 Atualizando senha no Chatwoot para agente:', mappingData.chatwoot_agent_id);
        
        const CHATWOOT_URL = Deno.env.get('CHATWOOT_BASE_URL') || 'https://chat.ybrasil.com.br';
        const ACCOUNT_ID = Deno.env.get('CHATWOOT_ACCOUNT_ID') || '1';
        const TOKEN = Deno.env.get('CHATWOOT_API_TOKEN');
        
        if (!TOKEN) {
          console.warn('⚠️ Token do Chatwoot não configurado');
        } else {
          const chatwootRes = await fetch(
            `${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/agents/${mappingData.chatwoot_agent_id}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'api_access_token': TOKEN
              },
              body: JSON.stringify({
                password: tempPassword
              })
            }
          );
          
          if (!chatwootRes.ok) {
            const errorText = await chatwootRes.text();
            console.warn('⚠️ Erro ao atualizar senha no Chatwoot:', chatwootRes.status, errorText);
          } else {
            console.log('✅ Senha atualizada no Chatwoot');
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro ao sincronizar senha com Chatwoot:', error);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        tempPassword,
        message: "Senha temporária gerada com sucesso"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("❌ Erro:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

// Gerar senha aleatória de 8 caracteres (letras maiúsculas, minúsculas e números)
function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    password += chars[randomIndex];
  }
  
  return password;
}

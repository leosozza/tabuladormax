// ============================================
// Delete WhatsApp History - Admin only
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface DeleteHistoryRequest {
  bitrix_ids?: string[];
  phone_numbers?: string[];
  conversation_ids?: number[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || userRole.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem excluir histórico' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: DeleteHistoryRequest = await req.json();
    const { bitrix_ids, phone_numbers, conversation_ids } = body;

    if (!bitrix_ids?.length && !phone_numbers?.length && !conversation_ids?.length) {
      return new Response(
        JSON.stringify({ error: 'É necessário fornecer bitrix_ids, phone_numbers ou conversation_ids' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalDeleted = 0;

    // Deletar por bitrix_id
    if (bitrix_ids?.length) {
      const { count, error } = await supabase
        .from('whatsapp_messages')
        .delete({ count: 'exact' })
        .in('bitrix_id', bitrix_ids);

      if (error) {
        console.error('Erro ao deletar por bitrix_id:', error);
      } else {
        totalDeleted += count || 0;
        console.log(`✅ Deletadas ${count} mensagens por bitrix_id`);
      }
    }

    // Deletar por phone_number
    if (phone_numbers?.length) {
      const normalizedPhones = phone_numbers.map(p => p.replace(/\D/g, ''));
      const { count, error } = await supabase
        .from('whatsapp_messages')
        .delete({ count: 'exact' })
        .in('phone_number', normalizedPhones);

      if (error) {
        console.error('Erro ao deletar por phone_number:', error);
      } else {
        totalDeleted += count || 0;
        console.log(`✅ Deletadas ${count} mensagens por phone_number`);
      }
    }

    // Deletar por conversation_id
    if (conversation_ids?.length) {
      const { count, error } = await supabase
        .from('whatsapp_messages')
        .delete({ count: 'exact' })
        .in('conversation_id', conversation_ids);

      if (error) {
        console.error('Erro ao deletar por conversation_id:', error);
      } else {
        totalDeleted += count || 0;
        console.log(`✅ Deletadas ${count} mensagens por conversation_id`);
      }
    }

    // Registrar log
    console.log(`📋 Admin ${user.email} deletou ${totalDeleted} mensagens`);

    return new Response(
      JSON.stringify({
        success: true,
        deleted_count: totalDeleted,
        message: `${totalDeleted} mensagens excluídas com sucesso`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro em delete-whatsapp-history:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================
// Gupshup Check Window Bulk - Verificação em lote de janelas WhatsApp
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface WindowStatus {
  phone_number: string;
  is_open: boolean;
  hours_remaining: number;
  minutes_remaining: number;
  last_customer_message_at: string | null;
}

interface BulkCheckRequest {
  phone_numbers: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body: BulkCheckRequest = await req.json();
    const { phone_numbers } = body;

    if (!phone_numbers || !Array.isArray(phone_numbers) || phone_numbers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'phone_numbers é obrigatório e deve ser um array não vazio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limitar a 500 telefones por request
    if (phone_numbers.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Máximo de 500 telefones por request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📱 Verificando janelas para ${phone_numbers.length} telefones`);

    // Buscar a última mensagem inbound de cada telefone
    // Usando uma query otimizada com DISTINCT ON
    const { data: messages, error } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('phone_number, created_at')
      .in('phone_number', phone_numbers)
      .eq('direction', 'inbound')
      .order('phone_number')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar mensagens:', error);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar mensagens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Agrupar por telefone e pegar a mais recente de cada
    const lastMessageByPhone = new Map<string, Date>();
    for (const msg of messages || []) {
      if (!lastMessageByPhone.has(msg.phone_number)) {
        lastMessageByPhone.set(msg.phone_number, new Date(msg.created_at));
      }
    }

    const now = new Date();
    const WINDOW_HOURS = 24;

    const results: WindowStatus[] = phone_numbers.map(phone => {
      const lastCustomerMessage = lastMessageByPhone.get(phone);
      
      if (!lastCustomerMessage) {
        return {
          phone_number: phone,
          is_open: false,
          hours_remaining: 0,
          minutes_remaining: 0,
          last_customer_message_at: null,
        };
      }

      const hoursSinceLastMessage = (now.getTime() - lastCustomerMessage.getTime()) / (1000 * 60 * 60);
      const isOpen = hoursSinceLastMessage < WINDOW_HOURS;
      
      const hoursRemaining = isOpen ? Math.floor(WINDOW_HOURS - hoursSinceLastMessage) : 0;
      const minutesRemaining = isOpen 
        ? Math.floor((WINDOW_HOURS - hoursSinceLastMessage - hoursRemaining) * 60) 
        : 0;

      return {
        phone_number: phone,
        is_open: isOpen,
        hours_remaining: hoursRemaining,
        minutes_remaining: minutesRemaining,
        last_customer_message_at: lastCustomerMessage.toISOString(),
      };
    });

    const activeCount = results.filter(r => r.is_open).length;
    console.log(`✅ Janelas verificadas: ${activeCount}/${phone_numbers.length} ativas`);

    return new Response(
      JSON.stringify({
        total: phone_numbers.length,
        active_count: activeCount,
        windows: results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro no gupshup-check-window-bulk:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

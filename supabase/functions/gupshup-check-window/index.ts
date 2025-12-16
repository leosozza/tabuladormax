import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WindowCheckRequest {
  phone_number?: string;
  bitrix_id?: string;
}

interface WindowStatus {
  is_open: boolean;
  hours_remaining: number | null;
  minutes_remaining: number | null;
  last_customer_message_at: string | null;
  source: 'gupshup_webhook';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: WindowCheckRequest = await req.json();
    const { phone_number, bitrix_id } = body;

    console.log('[gupshup-check-window] Request:', { phone_number, bitrix_id });

    if (!phone_number && !bitrix_id) {
      return new Response(
        JSON.stringify({ error: 'phone_number ou bitrix_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar última mensagem inbound APENAS da tabela whatsapp_messages
    // Essas mensagens são registradas pelo gupshup-webhook
    let query = supabase
      .from('whatsapp_messages')
      .select('created_at, phone_number, bitrix_id')
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false })
      .limit(1);

    // Construir filtro OR manualmente
    if (phone_number && bitrix_id) {
      query = query.or(`phone_number.eq.${phone_number},bitrix_id.eq.${bitrix_id}`);
    } else if (phone_number) {
      query = query.eq('phone_number', phone_number);
    } else if (bitrix_id) {
      query = query.eq('bitrix_id', bitrix_id);
    }

    const { data: lastMessage, error } = await query.maybeSingle();

    if (error) {
      console.error('[gupshup-check-window] Query error:', error);
      return new Response(
        JSON.stringify({ error: 'Erro ao consultar mensagens', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calcular status da janela de 24h
    let windowStatus: WindowStatus;

    if (!lastMessage) {
      console.log('[gupshup-check-window] No inbound message found');
      windowStatus = {
        is_open: false,
        hours_remaining: null,
        minutes_remaining: null,
        last_customer_message_at: null,
        source: 'gupshup_webhook'
      };
    } else {
      const lastMessageAt = new Date(lastMessage.created_at);
      const now = new Date();
      const windowCloseTime = new Date(lastMessageAt.getTime() + 24 * 60 * 60 * 1000); // +24h
      
      const isOpen = now < windowCloseTime;
      const msRemaining = windowCloseTime.getTime() - now.getTime();
      
      const hoursRemaining = isOpen ? Math.floor(msRemaining / (60 * 60 * 1000)) : null;
      const minutesRemaining = isOpen ? Math.floor((msRemaining % (60 * 60 * 1000)) / (60 * 1000)) : null;

      console.log('[gupshup-check-window] Window status:', {
        lastMessageAt: lastMessage.created_at,
        isOpen,
        hoursRemaining,
        minutesRemaining
      });

      windowStatus = {
        is_open: isOpen,
        hours_remaining: hoursRemaining,
        minutes_remaining: minutesRemaining,
        last_customer_message_at: lastMessage.created_at,
        source: 'gupshup_webhook'
      };
    }

    return new Response(
      JSON.stringify(windowStatus),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const error = err as Error;
    console.error('[gupshup-check-window] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

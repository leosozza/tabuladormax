import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface LocationPayload {
  scouter_bitrix_id: number;
  scouter_name: string;
  latitude: number;
  longitude: number;
  address?: string;
  recorded_at?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const payload: LocationPayload = await req.json();
    
    console.log('📍 Recebendo localização do scouter:', {
      id: payload.scouter_bitrix_id,
      name: payload.scouter_name,
      lat: payload.latitude,
      lng: payload.longitude
    });

    // Validação básica
    if (!payload.scouter_bitrix_id || !payload.latitude || !payload.longitude) {
      console.error('❌ Validação falhou - campos obrigatórios ausentes');
      return new Response(
        JSON.stringify({ 
          error: 'Campos obrigatórios: scouter_bitrix_id, latitude, longitude' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inserir na tabela de histórico
    const { data, error } = await supabase
      .from('scouter_location_history')
      .insert({
        scouter_bitrix_id: payload.scouter_bitrix_id,
        scouter_name: payload.scouter_name || `Scouter ${payload.scouter_bitrix_id}`,
        latitude: payload.latitude,
        longitude: payload.longitude,
        address: payload.address || 'Endereço não informado',
        recorded_at: payload.recorded_at || new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao salvar localização no banco:', error);
      throw error;
    }

    console.log('✅ Localização salva com sucesso:', data.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        id: data.id,
        message: 'Localização registrada com sucesso' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro no webhook de localização:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

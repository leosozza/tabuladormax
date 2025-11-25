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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
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

    // Resolver nome do scouter se não vier no payload
    let scouterName = payload.scouter_name;
    
    if (!scouterName && payload.scouter_bitrix_id) {
      console.log(`🔍 Tentando resolver nome do scouter ID: ${payload.scouter_bitrix_id}`);
      const { data: spaEntity } = await supabase
        .from('bitrix_spa_entities')
        .select('title')
        .eq('entity_type_id', 1096)  // Scouters
        .eq('bitrix_item_id', payload.scouter_bitrix_id)
        .maybeSingle();
      
      scouterName = spaEntity?.title || `Scouter ${payload.scouter_bitrix_id}`;
      console.log(`✅ Nome resolvido: ${scouterName}`);
    }

    // Inserir na tabela de histórico
    const { data, error } = await supabase
      .from('scouter_location_history')
      .insert({
        scouter_bitrix_id: payload.scouter_bitrix_id,
        scouter_name: scouterName,
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

    // Registrar evento de sincronização para monitoramento
    const syncStartTime = Date.now();
    try {
      await supabase
        .from('sync_events')
        .insert({
          event_type: 'location_webhook',
          direction: 'scouter_location_in',
          status: 'success',
          lead_id: 0, // Não é um lead, mas campo obrigatório
          sync_duration_ms: Date.now() - syncStartTime,
          fields_synced_count: 4,
          field_mappings: {
            scouter_bitrix_id: payload.scouter_bitrix_id,
            scouter_name: payload.scouter_name,
            latitude: payload.latitude,
            longitude: payload.longitude,
            address: payload.address || 'Endereço não informado'
          }
        });
      
      console.log('📊 Evento registrado em sync_events');
    } catch (syncError) {
      console.warn('⚠️ Falha ao registrar evento de sync:', syncError);
      // Não falhar o webhook se o log falhar
    }

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
    
    // Registrar erro em sync_events (sem depender do payload que pode ter falhado)
    try {
      await supabase
        .from('sync_events')
        .insert({
          event_type: 'location_webhook',
          direction: 'scouter_location_in',
          status: 'error',
          lead_id: 0,
          error_message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    } catch (syncError) {
      console.warn('⚠️ Falha ao registrar erro em sync_events:', syncError);
    }
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

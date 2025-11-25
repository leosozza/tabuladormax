import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface BitrixScouterItem {
  id: number;
  title: string;
  ufCrm1732642248585?: {
    address?: string;
    latitude?: string;
    longitude?: string;
  };
}

interface ScouterLocation {
  scouterBitrixId: number;
  scouterName: string;
  latitude: number;
  longitude: number;
  address: string;
  recordedAt: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bitrixToken = Deno.env.get('BITRIX_REST_TOKEN');
    const bitrixUrl = 'https://maxsystem.bitrix24.com.br';
    
    if (!bitrixToken) {
      throw new Error('BITRIX_REST_TOKEN not configured');
    }

    console.log('🔍 Fetching active scouters from Bitrix SPA 1096...');

    // Fetch active scouters from SPA 1096 with stage filter
    const bitrixResponse = await fetch(
      `${bitrixUrl}/rest/7/${bitrixToken}/crm.item.list`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityTypeId: 1096, // Gestão Scouter
          filter: {
            stageId: 'DT1096_210:NEW' // Ativos
          },
          select: ['id', 'title', 'ufCrm1732642248585'] // Geolocalização field
        })
      }
    );

    if (!bitrixResponse.ok) {
      const errorText = await bitrixResponse.text();
      console.error('❌ Bitrix API error:', errorText);
      throw new Error(`Bitrix API error: ${bitrixResponse.status}`);
    }

    const bitrixData = await bitrixResponse.json();
    console.log(`📍 Found ${bitrixData.result?.items?.length || 0} active scouters`);

    if (!bitrixData.result?.items || bitrixData.result.items.length === 0) {
      return new Response(
        JSON.stringify({ locations: [], message: 'No active scouters found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse locations from Bitrix address field
    const locations: ScouterLocation[] = [];
    const timestamp = new Date().toISOString();

    for (const item of bitrixData.result.items as BitrixScouterItem[]) {
      const geoField = item.ufCrm1732642248585;
      
      if (geoField?.latitude && geoField?.longitude) {
        const lat = parseFloat(geoField.latitude);
        const lng = parseFloat(geoField.longitude);

        if (!isNaN(lat) && !isNaN(lng)) {
          locations.push({
            scouterBitrixId: item.id,
            scouterName: item.title,
            latitude: lat,
            longitude: lng,
            address: geoField.address || 'Endereço não especificado',
            recordedAt: timestamp
          });
        }
      }
    }

    console.log(`✅ Parsed ${locations.length} locations with valid coordinates`);

    // Store in history table
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (locations.length > 0) {
      const { error: insertError } = await supabase
        .from('scouter_location_history')
        .insert(
          locations.map(loc => ({
            scouter_bitrix_id: loc.scouterBitrixId,
            scouter_name: loc.scouterName,
            latitude: loc.latitude,
            longitude: loc.longitude,
            address: loc.address,
            recorded_at: loc.recordedAt
          }))
        );

      if (insertError) {
        console.error('⚠️ Error storing location history:', insertError);
      } else {
        console.log('💾 Location history stored successfully');
      }
    }

    return new Response(
      JSON.stringify({ 
        locations,
        count: locations.length,
        timestamp 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error fetching scouter locations:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        locations: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
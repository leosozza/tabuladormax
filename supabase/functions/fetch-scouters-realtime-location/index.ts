import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface ScouterLocation {
  scouterBitrixId: number;
  scouterName: string;
  latitude: number;
  longitude: number;
  address: string;
  recordedAt: string;
}

// Helper function to parse geolocation field
const parseGeoField = (geoString: string | undefined): { lat: number; lng: number; address?: string } | null => {
  if (!geoString || geoString.includes('undefined')) return null;
  
  const parts = geoString.split('|;|');
  if (parts.length < 1) return null;
  
  const coords = parts[0].split(',');
  if (coords.length !== 2) return null;
  
  const lat = parseFloat(coords[0]);
  const lng = parseFloat(coords[1]);
  
  if (isNaN(lat) || isNaN(lng)) return null;
  
  return { lat, lng, address: parts[2] || undefined };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Fetching active scouters from cached data...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch from cached bitrix_spa_entities table
    const { data: scouters, error: fetchError } = await supabase
      .from('bitrix_spa_entities')
      .select('bitrix_item_id, title')
      .eq('entity_type_id', 1096)
      .eq('stage_id', 'DT1096_210:NEW');

    if (fetchError) {
      console.error('❌ Error fetching from cache:', fetchError);
      throw fetchError;
    }

    console.log(`📍 Found ${scouters?.length || 0} active scouters in cache`);

    if (!scouters || scouters.length === 0) {
      return new Response(
        JSON.stringify({ locations: [], message: 'No active scouters found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Now fetch geolocation data from Bitrix for each scouter
    const bitrixToken = Deno.env.get('BITRIX_REST_TOKEN');
    const bitrixUrl = 'https://maxsystem.bitrix24.com.br';
    
    if (!bitrixToken) {
      throw new Error('BITRIX_REST_TOKEN not configured');
    }

    const locations: ScouterLocation[] = [];
    const timestamp = new Date().toISOString();

    // Fetch geolocation for each scouter (in batches to avoid timeout)
    for (const scouter of scouters.slice(0, 20)) { // Limit to first 20 for now
      try {
        const geoResponse = await fetch(
          `${bitrixUrl}/rest/7/${bitrixToken}/crm.item.get`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entityTypeId: 1096,
              id: scouter.bitrix_item_id
            })
          }
        );

        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          const geoField = geoData.result?.item?.UF_CRM_1732642248585;
          
          if (geoField) {
            const parsed = parseGeoField(geoField);
            if (parsed) {
              locations.push({
                scouterBitrixId: scouter.bitrix_item_id,
                scouterName: scouter.title,
                latitude: parsed.lat,
                longitude: parsed.lng,
                address: parsed.address || 'Endereço não especificado',
                recordedAt: timestamp
              });
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ Could not fetch geolocation for scouter ${scouter.bitrix_item_id}:`, error);
      }
    }

    console.log(`✅ Parsed ${locations.length} locations with valid coordinates`);

    // Store in history table
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

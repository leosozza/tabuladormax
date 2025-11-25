import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface BitrixScouterItem {
  id: number;
  title: string;
  UF_CRM_1732642248585?: string; // formato: "lat,lng|;|id" ex: "-23.5491671,-46.685609|;|3046"
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

    // Fetch active scouters with pagination
    let allItems: BitrixScouterItem[] = [];
    let start = 0;
    
    while (true) {
      const bitrixResponse = await fetch(
        `${bitrixUrl}/rest/7/${bitrixToken}/crm.item.list`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityTypeId: 1096,
            filter: {
              stageId: 'DT1096_210:NEW'
            },
            select: ['id', 'title', 'UF_CRM_1732642248585'],
            start: start
          })
        }
      );

      if (!bitrixResponse.ok) {
        const errorText = await bitrixResponse.text();
        console.error('❌ Bitrix API error:', errorText);
        throw new Error(`Bitrix API error: ${bitrixResponse.status}`);
      }

      const bitrixData = await bitrixResponse.json();
      console.log(`📦 Batch ${Math.floor(start / 50) + 1} response:`, JSON.stringify(bitrixData, null, 2));
      
      const items = bitrixData.result?.items || [];
      
      if (items.length === 0) break;
      
      allItems.push(...items);
      console.log(`📦 Batch ${Math.floor(start / 50) + 1}: ${items.length} scouters fetched`);
      
      if (items.length < 50) break;
      start += 50;
    }

    console.log(`📍 Total active scouters found: ${allItems.length}`);

    if (allItems.length === 0) {
      return new Response(
        JSON.stringify({ locations: [], message: 'No active scouters found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse locations from Bitrix geolocation field
    const locations: ScouterLocation[] = [];
    const timestamp = new Date().toISOString();

    for (const item of allItems) {
      const geoData = parseGeoField(item.UF_CRM_1732642248585);
      
      if (geoData) {
        locations.push({
          scouterBitrixId: item.id,
          scouterName: item.title,
          latitude: geoData.lat,
          longitude: geoData.lng,
          address: geoData.address || 'Endereço não especificado',
          recordedAt: timestamp
        });
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
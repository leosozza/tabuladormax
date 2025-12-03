import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Parseia coordenadas de geolocalização do Bitrix
 * Formato: "lat,lng|;|timestamp" (ex: "-25.4319729,-49.2736954|;|38688")
 */
function parseGeoLocation(geoString: string | undefined | null): { lat: number; lng: number } | null {
  if (!geoString || geoString.includes('undefined')) return null;
  
  const parts = String(geoString).split('|;|');
  if (parts.length < 1) return null;
  
  const coords = parts[0].split(',');
  if (coords.length !== 2) return null;
  
  const lat = parseFloat(coords[0]);
  const lng = parseFloat(coords[1]);
  
  if (isNaN(lat) || isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  
  return { lat, lng };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parâmetros opcionais
    const { date_from, date_to, batch_size = 500, dry_run = false } = await req.json().catch(() => ({}));

    console.log('🔄 Iniciando backfill de geolocalização...');
    console.log(`📅 Período: ${date_from || 'início'} até ${date_to || 'hoje'}`);
    console.log(`📦 Batch size: ${batch_size}`);
    console.log(`🧪 Dry run: ${dry_run}`);

    // Buscar leads sem coordenadas mas com raw contendo UF_CRM_1732642248585
    let query = supabase
      .from('leads')
      .select('id, raw')
      .is('latitude', null)
      .not('raw', 'is', null)
      .limit(batch_size);

    if (date_from) {
      query = query.gte('criado', date_from);
    }
    if (date_to) {
      query = query.lte('criado', date_to);
    }

    const { data: leads, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Erro ao buscar leads:', fetchError);
      throw fetchError;
    }

    console.log(`📊 ${leads?.length || 0} leads encontrados sem coordenadas`);

    let updated = 0;
    let skipped = 0;
    let noGeoData = 0;
    const errors: Array<{ id: number; error: string }> = [];

    for (const lead of leads || []) {
      try {
        const raw = lead.raw as Record<string, any>;
        const geoField = raw?.['UF_CRM_1732642248585'];

        if (!geoField) {
          noGeoData++;
          continue;
        }

        const coordinates = parseGeoLocation(geoField);

        if (!coordinates) {
          console.warn(`⚠️ Lead ${lead.id}: formato inválido de geolocalização: "${geoField}"`);
          skipped++;
          continue;
        }

        console.log(`📍 Lead ${lead.id}: ${coordinates.lat}, ${coordinates.lng}`);

        if (!dry_run) {
          const { error: updateError } = await supabase
            .from('leads')
            .update({
              latitude: coordinates.lat,
              longitude: coordinates.lng,
              geocoded_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', lead.id);

          if (updateError) {
            console.error(`❌ Erro ao atualizar lead ${lead.id}:`, updateError);
            errors.push({ id: lead.id, error: updateError.message });
            continue;
          }
        }

        updated++;
      } catch (e) {
        console.error(`❌ Erro processando lead ${lead.id}:`, e);
        errors.push({ id: lead.id, error: String(e) });
      }
    }

    const result = {
      success: true,
      total_processed: leads?.length || 0,
      updated,
      skipped,
      no_geo_data: noGeoData,
      errors: errors.length,
      error_details: errors.slice(0, 10), // Primeiros 10 erros
      dry_run,
      message: dry_run 
        ? `🧪 Dry run: ${updated} leads SERIAM atualizados`
        : `✅ ${updated} leads atualizados com coordenadas`
    };

    console.log('📊 Resultado:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro no backfill:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

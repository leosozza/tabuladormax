/**
 * Edge Function: fichas-geo-enrich
 * Enriquece leads com geolocalização persistindo lat/lng no banco
 * Auth: Authorization header ou X-Secret
 */
import { serve } from "https://deno.land/std@0.193.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-secret',
};

const RE_COORDS = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/;

interface GeocoordResult {
  latitude: number;
  longitude: number;
}

function parseLeadLocalizacaoToLatLng(localizacao?: string | null): GeocoordResult | null {
  if (!localizacao) return null;
  const m = localizacao.match(RE_COORDS);
  if (m) {
    const latitude = parseFloat(m[1]);
    const longitude = parseFloat(m[2]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }
  return null;
}

async function checkGeocache(
  query: string,
  supabaseUrl: string,
  serviceKey: string
): Promise<GeocoordResult | null> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/geocache?query=eq.${encodeURIComponent(query)}`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    }
  );

  if (!res.ok) return null;
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) {
    return { latitude: data[0].lat, longitude: data[0].lng };
  }
  return null;
}

async function geocodeAddress(address: string): Promise<GeocoordResult | null> {
  // Usando Nominatim (OpenStreetMap)
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    address
  )}&limit=1`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "TabuladorMax/1.0",
      },
    });

    if (!res.ok) return null;
    const data = await res.json();

    if (Array.isArray(data) && data.length > 0) {
      const latitude = parseFloat(data[0].lat);
      const longitude = parseFloat(data[0].lon);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return { latitude, longitude };
      }
    }
  } catch (error) {
    console.error("Geocoding error:", error);
  }

  return null;
}

async function saveToGeocache(
  query: string,
  latitude: number,
  longitude: number,
  supabaseUrl: string,
  serviceKey: string
) {
  try {
    await fetch(`${supabaseUrl}/rest/v1/geocache`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query, lat: latitude, lng: longitude }),
    });
  } catch (error) {
    console.error("Error saving to geocache:", error);
  }
}

async function updateLeadLocation(
  id: number,
  latitude: number,
  longitude: number,
  supabaseClient: any
): Promise<boolean> {
  try {
    const { error } = await supabaseClient
      .from("leads")
      .update({ latitude, longitude })
      .eq("id", id);

    return !error;
  } catch (error) {
    console.error("Error updating lead:", error);
    return false;
  }
}

async function enrichLeads(limit: number = 50) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabaseClient = createClient(SUPABASE_URL, SERVICE_KEY);

  // Buscar leads sem latitude/longitude mas com endereço ou localização
  const { data: leads, error } = await supabaseClient
    .from("leads")
    .select("id, address, local_abordagem")
    .is("latitude", null)
    .or("address.not.is.null,local_abordagem.not.is.null")
    .limit(limit);

  if (error) {
    console.error("Error fetching leads:", error);
    throw error;
  }

  const results = {
    processed: 0,
    enriched: 0,
    skipped: 0,
    errors: 0,
  };

  for (const lead of leads || []) {
    results.processed++;

    // Tentar parse direto de coordenadas no campo local_abordagem
    const directCoords = parseLeadLocalizacaoToLatLng(lead.local_abordagem);
    if (directCoords) {
      const success = await updateLeadLocation(
        lead.id,
        directCoords.latitude,
        directCoords.longitude,
        supabaseClient
      );
      if (success) {
        results.enriched++;
        console.log(`Lead ${lead.id} enriched with direct coords`);
        continue;
      }
    }

    // Geocodificar endereço
    if (lead.address) {
      // Verificar cache primeiro
      let coords = await checkGeocache(lead.address, SUPABASE_URL, SERVICE_KEY);

      // Se não encontrou no cache, geocodificar
      if (!coords) {
        coords = await geocodeAddress(lead.address);
        if (coords) {
          // Salvar no cache
          await saveToGeocache(
            lead.address,
            coords.latitude,
            coords.longitude,
            SUPABASE_URL,
            SERVICE_KEY
          );
          // Delay para respeitar rate limit do Nominatim
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (coords) {
        const success = await updateLeadLocation(
          lead.id,
          coords.latitude,
          coords.longitude,
          supabaseClient
        );
        if (success) {
          results.enriched++;
          console.log(`Lead ${lead.id} enriched via geocoding`);
          continue;
        }
      }
    }

    results.skipped++;
  }

  return results;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");

    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    const secretHeader = req.headers.get("X-Secret");
    const sharedSecret = Deno.env.get("SHEETS_SYNC_SHARED_SECRET");

    if (!authHeader && (!secretHeader || secretHeader !== sharedSecret)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const results = await enrichLeads(limit);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Edge Function: leads-geo-enrich (formerly fichas-geo-enrich)
 * Enriquece leads com geolocalização a partir da coluna "Localização"
 * Auth: header 'X-Secret: SHEETS_SYNC_SHARED_SECRET'
 * 
 * ⚠️ ATENÇÃO: Usa EXCLUSIVAMENTE a tabela 'leads' (fonte única de verdade)
 */
import { serve } from "https://deno.land/std@0.193.0/http/server.ts";

const RE_COORDS = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/;

function parseLeadLocalizacaoToLatLng(localizacao?: string | null): { latitude: number; longitude: number } | null {
  if (!localizacao) return null;
  const m = localizacao.match(RE_COORDS);
  if (m) {
    const latitude = parseFloat(m[1]);
    const longitude = parseFloat(m[2]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) return { latitude, longitude };
  }
  return null;
}

async function checkGeocache(query: string, supabaseUrl: string, serviceKey: string): Promise<{ latitude: number; longitude: number } | null> {
  const res = await fetch(`${supabaseUrl}/rest/v1/geocache?query=eq.${encodeURIComponent(query)}`, {
    headers: {
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
    },
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) {
    return { latitude: data[0].lat, longitude: data[0].lng };
  }
  return null;
}

async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
  // Usando Nominatim (OpenStreetMap)
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
  
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "GestaoScouter/1.0",
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

async function saveToGeocache(query: string, latitude: number, longitude: number, supabaseUrl: string, serviceKey: string) {
  await fetch(`${supabaseUrl}/rest/v1/geocache`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates",
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ query, lat: latitude, lng: longitude }),
  });
}

async function updateLeadLocation(id: string, latitude: number, longitude: number, supabaseUrl: string, serviceKey: string) {
  const res = await fetch(`${supabaseUrl}/rest/v1/leads?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ latitude, longitude }),
  });

  return res.ok;
}

async function enrichLeads(limit: number = 50) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

  // Buscar leads sem latitude/longitude mas com localização
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/leads?latitude=is.null&localizacao=not.is.null&or=(deleted.is.false,deleted.is.null)&limit=${limit}`,
    {
      headers: {
        "apikey": SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch leads");
  }

  const leads = await res.json();
  let processed = 0;
  let geocoded = 0;
  let fromCache = 0;

  for (const lead of leads) {
    const localizacao = lead.localizacao;
    if (!localizacao) continue;

    // Tentar parse direto de coordenadas
    const coords = parseLeadLocalizacaoToLatLng(localizacao);
    
    if (coords) {
      // É coordenada direta
      const success = await updateLeadLocation(lead.id, coords.latitude, coords.longitude, SUPABASE_URL, SERVICE_KEY);
      if (success) {
        processed++;
        geocoded++;
      }
    } else {
      // É endereço, precisa geocodificar
      // Primeiro checar cache
      let geoCoords = await checkGeocache(localizacao, SUPABASE_URL, SERVICE_KEY);
      
      if (geoCoords) {
        fromCache++;
      } else {
        // Geocodificar
        geoCoords = await geocodeAddress(localizacao);
        
        if (geoCoords) {
          // Salvar no cache
          await saveToGeocache(localizacao, geoCoords.latitude, geoCoords.longitude, SUPABASE_URL, SERVICE_KEY);
          geocoded++;
        }
        
        // Respeitar rate limit do Nominatim (1 req/sec)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (geoCoords) {
        const success = await updateLeadLocation(lead.id, geoCoords.latitude, geoCoords.longitude, SUPABASE_URL, SERVICE_KEY);
        if (success) processed++;
      }
    }
  }

  return { processed, geocoded, fromCache, total: leads.length };
}

serve(async (req) => {
  try {
    const secret = req.headers.get("X-Secret");
    if (secret !== Deno.env.get("SHEETS_SYNC_SHARED_SECRET")) {
      return new Response("forbidden", { status: 403 });
    }

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const result = await enrichLeads(limit);

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in leads-geo-enrich:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

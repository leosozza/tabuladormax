import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeocodeRequest {
  lat: number;
  lon: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TOMTOM_API_KEY = Deno.env.get('TOMTOM_API_KEY');
    
    if (!TOMTOM_API_KEY) {
      console.error('TOMTOM_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'TomTom API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { lat, lon }: GeocodeRequest = await req.json();

    if (!lat || !lon) {
      return new Response(
        JSON.stringify({ error: 'Missing lat/lon coordinates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Reverse geocoding ${lat},${lon}`);

    // TomTom Reverse Geocode API
    const url = `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lon}.json?key=${TOMTOM_API_KEY}&language=pt-BR`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`TomTom Reverse Geocode API error: ${response.status}`, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to reverse geocode', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const address = data.addresses?.[0]?.address;

    if (!address) {
      return new Response(
        JSON.stringify({ 
          error: 'No address found',
          lat,
          lon,
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = {
      freeformAddress: address.freeformAddress || '',
      streetName: address.streetName || '',
      streetNumber: address.streetNumber || '',
      neighbourhood: address.municipalitySubdivision || address.neighbourhood || '',
      municipality: address.municipality || '',
      city: address.municipalitySubdivision || address.municipality || '',
      state: address.countrySubdivision || '',
      stateCode: address.countrySubdivisionCode || '',
      country: address.country || '',
      countryCode: address.countryCode || '',
      postalCode: address.postalCode || '',
      lat,
      lon,
    };

    console.log(`Address found: ${result.freeformAddress}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in tomtom-reverse-geocode:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TOMTOM_API_KEY = Deno.env.get('TOMTOM_API_KEY');
    
    if (!TOMTOM_API_KEY) {
      console.error('TOMTOM_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'TomTom API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const url = new URL(req.url);
    const z = url.searchParams.get('z');
    const x = url.searchParams.get('x');
    const y = url.searchParams.get('y');

    if (!z || !x || !y) {
      return new Response(
        JSON.stringify({ error: 'Missing tile coordinates (z, x, y)' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // TomTom Orbis Maps Traffic Flow Tiles API (November 2024+)
    // https://developer.tomtom.com/orbis-maps/documentation/raster/traffic-flow-tiles
    const tomtomUrl = `https://api.tomtom.com/maps/orbis/traffic/tile/flow/${z}/${x}/${y}.png?apiVersion=1&key=${TOMTOM_API_KEY}&style=light&tileSize=256`;

    console.log(`Fetching traffic tile: z=${z}, x=${x}, y=${y}`);

    const response = await fetch(tomtomUrl);

    if (!response.ok) {
      console.error(`TomTom API error: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch traffic tile' }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const imageBuffer = await response.arrayBuffer();

    return new Response(imageBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      },
    });

  } catch (error) {
    console.error('Error in get-traffic-tiles:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

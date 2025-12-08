import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrafficRequest {
  lat: number;
  lon: number;
  zoom?: number;
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

    const { lat, lon, zoom = 10 }: TrafficRequest = await req.json();

    if (!lat || !lon) {
      return new Response(
        JSON.stringify({ error: 'Missing lat/lon coordinates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching traffic flow data at ${lat},${lon}`);

    // TomTom Traffic Flow Segment Data API
    const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/${zoom}/json?key=${TOMTOM_API_KEY}&point=${lat},${lon}&unit=KMPH`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`TomTom Traffic Flow API error: ${response.status}`, errorText);
      
      // Return default data on error
      return new Response(
        JSON.stringify({
          currentSpeed: null,
          freeFlowSpeed: null,
          confidence: 0,
          roadClosure: false,
          congestionLevel: 'unknown',
          error: 'Traffic data unavailable',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const flowData = data.flowSegmentData;

    if (!flowData) {
      return new Response(
        JSON.stringify({
          currentSpeed: null,
          freeFlowSpeed: null,
          confidence: 0,
          roadClosure: false,
          congestionLevel: 'unknown',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate congestion level
    const currentSpeed = flowData.currentSpeed || 0;
    const freeFlowSpeed = flowData.freeFlowSpeed || 0;
    const speedRatio = freeFlowSpeed > 0 ? currentSpeed / freeFlowSpeed : 1;
    
    let congestionLevel: string;
    if (flowData.roadClosure) {
      congestionLevel = 'closed';
    } else if (speedRatio >= 0.9) {
      congestionLevel = 'free';
    } else if (speedRatio >= 0.7) {
      congestionLevel = 'light';
    } else if (speedRatio >= 0.5) {
      congestionLevel = 'moderate';
    } else if (speedRatio >= 0.3) {
      congestionLevel = 'heavy';
    } else {
      congestionLevel = 'severe';
    }

    const result = {
      currentSpeed: flowData.currentSpeed,
      freeFlowSpeed: flowData.freeFlowSpeed,
      currentTravelTime: flowData.currentTravelTime,
      freeFlowTravelTime: flowData.freeFlowTravelTime,
      confidence: flowData.confidence || 0,
      roadClosure: flowData.roadClosure || false,
      congestionLevel,
      speedRatio: Math.round(speedRatio * 100),
      coordinates: flowData.coordinates?.coordinate || [],
    };

    console.log(`Traffic at ${lat},${lon}: ${currentSpeed}km/h (${congestionLevel})`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in tomtom-traffic-flow:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

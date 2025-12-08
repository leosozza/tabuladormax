import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Waypoint {
  lat: number;
  lon: number;
  id?: string | number;
  name?: string;
}

interface RouteRequest {
  origin: Waypoint;
  destinations: Waypoint[];
  travelMode?: 'car' | 'pedestrian' | 'bicycle';
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

    const { origin, destinations, travelMode = 'car' }: RouteRequest = await req.json();

    if (!origin || !destinations || destinations.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing origin or destinations' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Optimizing route from ${origin.lat},${origin.lon} to ${destinations.length} destinations`);

    // If only 1-2 destinations, use simple routing
    if (destinations.length <= 2) {
      const waypoints = [origin, ...destinations];
      const locations = waypoints.map(w => `${w.lat},${w.lon}`).join(':');
      
      const routeUrl = `https://api.tomtom.com/routing/1/calculateRoute/${locations}/json?key=${TOMTOM_API_KEY}&travelMode=${travelMode}&traffic=true`;
      
      const response = await fetch(routeUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`TomTom Routing API error: ${response.status}`, errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to calculate route', details: errorText }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      const route = data.routes?.[0];

      if (!route) {
        return new Response(
          JSON.stringify({ error: 'No route found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Extract polyline points for map display
      const points = route.legs?.flatMap((leg: any) => 
        leg.points?.map((p: any) => ({ lat: p.latitude, lon: p.longitude })) || []
      ) || [];

      return new Response(
        JSON.stringify({
          optimizedOrder: destinations.map((d, i) => ({ ...d, order: i + 1 })),
          totalDistance: route.summary?.lengthInMeters || 0,
          totalTime: route.summary?.travelTimeInSeconds || 0,
          totalTimeWithTraffic: route.summary?.trafficDelayInSeconds 
            ? (route.summary.travelTimeInSeconds + route.summary.trafficDelayInSeconds) 
            : route.summary?.travelTimeInSeconds || 0,
          trafficDelay: route.summary?.trafficDelayInSeconds || 0,
          polyline: points,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For 3+ destinations, use Waypoint Optimization API
    const waypointOptUrl = `https://api.tomtom.com/routing/waypointoptimization/1?key=${TOMTOM_API_KEY}`;
    
    const requestBody = {
      waypoints: [
        { point: { latitude: origin.lat, longitude: origin.lon } },
        ...destinations.map(d => ({ point: { latitude: d.lat, longitude: d.lon } }))
      ],
      options: {
        travelMode: travelMode,
        traffic: 'live',
        departAt: 'now',
      }
    };

    const optResponse = await fetch(waypointOptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!optResponse.ok) {
      const errorText = await optResponse.text();
      console.error(`TomTom Waypoint Optimization API error: ${optResponse.status}`, errorText);
      
      // Fallback to simple routing without optimization
      console.log('Falling back to simple routing...');
      const waypoints = [origin, ...destinations];
      const locations = waypoints.map(w => `${w.lat},${w.lon}`).join(':');
      
      const fallbackUrl = `https://api.tomtom.com/routing/1/calculateRoute/${locations}/json?key=${TOMTOM_API_KEY}&travelMode=${travelMode}&traffic=true`;
      const fallbackResponse = await fetch(fallbackUrl);
      
      if (!fallbackResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to calculate route' }),
          { status: fallbackResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const fallbackData = await fallbackResponse.json();
      const route = fallbackData.routes?.[0];

      const points = route?.legs?.flatMap((leg: any) => 
        leg.points?.map((p: any) => ({ lat: p.latitude, lon: p.longitude })) || []
      ) || [];

      return new Response(
        JSON.stringify({
          optimizedOrder: destinations.map((d, i) => ({ ...d, order: i + 1 })),
          totalDistance: route?.summary?.lengthInMeters || 0,
          totalTime: route?.summary?.travelTimeInSeconds || 0,
          totalTimeWithTraffic: route?.summary?.travelTimeInSeconds || 0,
          trafficDelay: route?.summary?.trafficDelayInSeconds || 0,
          polyline: points,
          isOptimized: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const optData = await optResponse.json();
    
    // Map optimized order back to original destinations
    const optimizedWaypoints = optData.optimizedOrder || [];
    const optimizedDestinations = optimizedWaypoints
      .slice(1) // Skip origin
      .map((idx: number, order: number) => ({
        ...destinations[idx - 1],
        order: order + 1,
      }));

    // Get route polyline
    const orderedLocations = [origin, ...optimizedDestinations].map(w => `${w.lat},${w.lon}`).join(':');
    const routeUrl = `https://api.tomtom.com/routing/1/calculateRoute/${orderedLocations}/json?key=${TOMTOM_API_KEY}&travelMode=${travelMode}&traffic=true`;
    
    const routeResponse = await fetch(routeUrl);
    const routeData = await routeResponse.json();
    const route = routeData.routes?.[0];

    const points = route?.legs?.flatMap((leg: any) => 
      leg.points?.map((p: any) => ({ lat: p.latitude, lon: p.longitude })) || []
    ) || [];

    console.log(`Route optimized: ${optimizedDestinations.length} destinations, ${route?.summary?.lengthInMeters}m`);

    return new Response(
      JSON.stringify({
        optimizedOrder: optimizedDestinations,
        totalDistance: route?.summary?.lengthInMeters || optData.summary?.totalDistanceInMeters || 0,
        totalTime: route?.summary?.travelTimeInSeconds || optData.summary?.totalTimeInSeconds || 0,
        totalTimeWithTraffic: route?.summary?.travelTimeInSeconds || 0,
        trafficDelay: route?.summary?.trafficDelayInSeconds || 0,
        polyline: points,
        isOptimized: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in tomtom-optimize-route:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

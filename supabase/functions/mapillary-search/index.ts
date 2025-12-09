import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MAPILLARY_ACCESS_TOKEN = Deno.env.get("MAPILLARY_ACCESS_TOKEN");
    if (!MAPILLARY_ACCESS_TOKEN) {
      throw new Error("MAPILLARY_ACCESS_TOKEN not configured");
    }

    const { lat, lng, radius = 50 } = await req.json();

    if (!lat || !lng) {
      throw new Error("lat and lng are required");
    }

    // Calculate bbox around the point
    const delta = radius / 111320; // Approximate meters to degrees
    const west = lng - delta;
    const south = lat - delta;
    const east = lng + delta;
    const north = lat + delta;

    // Search for images in the area
    const searchUrl = `https://graph.mapillary.com/images?access_token=${MAPILLARY_ACCESS_TOKEN}&fields=id,computed_geometry,captured_at,thumb_1024_url,thumb_2048_url,compass_angle&bbox=${west},${south},${east},${north}&limit=20`;

    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mapillary API error:", errorText);
      throw new Error(`Mapillary API error: ${response.status}`);
    }

    const data = await response.json();

    // Sort by distance to the clicked point and return
    const images = (data.data || []).map((img: any) => {
      const imgLat = img.computed_geometry?.coordinates?.[1];
      const imgLng = img.computed_geometry?.coordinates?.[0];
      const distance = imgLat && imgLng 
        ? Math.sqrt(Math.pow(imgLat - lat, 2) + Math.pow(imgLng - lng, 2)) * 111320
        : Infinity;

      return {
        id: img.id,
        lat: imgLat,
        lng: imgLng,
        capturedAt: img.captured_at,
        thumb1024: img.thumb_1024_url,
        thumb2048: img.thumb_2048_url,
        compassAngle: img.compass_angle,
        distance
      };
    }).sort((a: any, b: any) => a.distance - b.distance);

    return new Response(
      JSON.stringify({ 
        images,
        accessToken: MAPILLARY_ACCESS_TOKEN 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

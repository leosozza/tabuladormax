import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface POIRequest {
  lat: number;
  lon: number;
  radius?: number;
  categories?: string[];
}

// TomTom category IDs for high-traffic locations
const CATEGORY_MAP: Record<string, string> = {
  shopping: '7373', // Shopping centers
  school: '7372', // Schools
  hospital: '7321', // Hospitals
  park: '9362', // Parks
  metro: '7380', // Public transport stations
  mall: '7373007', // Shopping malls
  university: '7372002', // Universities
  gym: '7320', // Sports centers
  restaurant: '7315', // Restaurants
  bank: '7328', // Banks
  pedestrian: '9376,7376', // Pedestrian zones + Shopping districts
};

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

    const { lat, lon, radius = 2000, categories = ['shopping', 'school', 'hospital', 'park', 'metro'] }: POIRequest = await req.json();

    if (!lat || !lon) {
      return new Response(
        JSON.stringify({ error: 'Missing lat/lon coordinates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching POIs at ${lat},${lon} with radius ${radius}m for categories:`, categories);

    // Build category IDs string
    const categoryIds = categories
      .map(cat => CATEGORY_MAP[cat])
      .filter(Boolean)
      .join(',');

    // TomTom Category Search API
    const url = `https://api.tomtom.com/search/2/categorySearch/.json?key=${TOMTOM_API_KEY}&lat=${lat}&lon=${lon}&radius=${radius}&categorySet=${categoryIds}&limit=50`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`TomTom API error: ${response.status}`, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch POIs', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Transform results to simpler format
    const pois = data.results?.map((result: any) => ({
      id: result.id,
      name: result.poi?.name || 'Unknown',
      category: result.poi?.categorySet?.[0]?.id || '',
      categoryName: result.poi?.categories?.[0] || 'Outro',
      address: result.address?.freeformAddress || '',
      lat: result.position?.lat,
      lon: result.position?.lon,
      distance: result.dist,
      phone: result.poi?.phone,
    })) || [];

    console.log(`Found ${pois.length} POIs`);

    return new Response(
      JSON.stringify({ pois, total: pois.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in tomtom-search-pois:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

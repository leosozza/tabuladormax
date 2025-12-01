import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP from headers (Cloudflare/Deno Deploy provides this)
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     req.headers.get('x-real-ip') ||
                     'auto';

    console.log('Detecting location for IP:', clientIP);

    // Call ip-api.com for geolocation (free, no key needed)
    // Use 'auto' to let the API detect the IP automatically
    const response = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,query`, {
      headers: {
        'User-Agent': 'Lovable-PreCadastro/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`IP API returned ${response.status}`);
    }

    const data = await response.json();

    console.log('IP API response:', data);

    if (data.status !== 'success') {
      throw new Error(data.message || 'Failed to detect location');
    }

    // Map region codes to state abbreviations for Brazil
    const stateMap: { [key: string]: string } = {
      'AC': 'AC', 'AL': 'AL', 'AP': 'AP', 'AM': 'AM', 'BA': 'BA',
      'CE': 'CE', 'DF': 'DF', 'ES': 'ES', 'GO': 'GO', 'MA': 'MA',
      'MT': 'MT', 'MS': 'MS', 'MG': 'MG', 'PA': 'PA', 'PB': 'PB',
      'PR': 'PR', 'PE': 'PE', 'PI': 'PI', 'RJ': 'RJ', 'RN': 'RN',
      'RS': 'RS', 'RO': 'RO', 'RR': 'RR', 'SC': 'SC', 'SP': 'SP',
      'SE': 'SE', 'TO': 'TO'
    };

    const estado = data.countryCode === 'BR' ? (stateMap[data.region] || data.region) : '';
    const cidade = data.city || '';

    return new Response(
      JSON.stringify({
        success: true,
        cidade,
        estado,
        pais: data.country,
        ip: data.query,
        coords: {
          lat: data.lat,
          lon: data.lon
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error detecting location:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        cidade: '',
        estado: ''
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 even on error so the app can handle it gracefully
      }
    );
  }
});

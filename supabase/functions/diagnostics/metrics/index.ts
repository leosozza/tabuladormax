import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    // Generate mock metrics data
    const snapshot = {
      req_per_s: Math.floor(Math.random() * 50) + 10, // 10-60 req/s
      latency_p95_ms: Math.floor(Math.random() * 200) + 50, // 50-250ms
      error_rate_pct: (Math.random() * 2).toFixed(2), // 0-2%
      db_connections: Math.floor(Math.random() * 20) + 5, // 5-25 connections
    };

    console.log('[diagnostics/metrics] Generated snapshot:', snapshot);

    return new Response(
      JSON.stringify({ snapshot }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('[diagnostics/metrics] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

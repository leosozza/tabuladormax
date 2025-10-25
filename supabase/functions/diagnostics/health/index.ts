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
    // Generate mock health checks
    const healthChecks = [
      {
        name: 'Database',
        status: Math.random() > 0.1 ? 'healthy' : 'degraded',
        latency_ms: Math.floor(Math.random() * 50) + 10,
        description: 'PostgreSQL connection pool status',
      },
      {
        name: 'Edge Functions',
        status: Math.random() > 0.05 ? 'healthy' : 'unhealthy',
        latency_ms: Math.floor(Math.random() * 30) + 5,
        description: 'Deno runtime and function execution',
      },
      {
        name: 'Storage',
        status: Math.random() > 0.08 ? 'healthy' : 'degraded',
        latency_ms: Math.floor(Math.random() * 100) + 20,
        description: 'Object storage availability',
      },
      {
        name: 'Auth Service',
        status: Math.random() > 0.05 ? 'healthy' : 'unhealthy',
        latency_ms: Math.floor(Math.random() * 40) + 15,
        description: 'Authentication and session management',
      },
      {
        name: 'PostgREST API',
        status: Math.random() > 0.07 ? 'healthy' : 'degraded',
        latency_ms: Math.floor(Math.random() * 60) + 25,
        description: 'REST API layer performance',
      },
    ];

    console.log('[diagnostics/health] Health checks generated:', healthChecks.length);

    return new Response(
      JSON.stringify(healthChecks),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('[diagnostics/health] Error:', error);
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

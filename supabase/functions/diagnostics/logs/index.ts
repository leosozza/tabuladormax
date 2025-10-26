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
    const url = new URL(req.url);
    const cursor = url.searchParams.get('cursor');
    const level = url.searchParams.get('level') || 'all';
    const q = url.searchParams.get('q') || '';

    console.log('[diagnostics/logs] Query params:', { cursor, level, q });

    // Generate mock log entries
    const logLevels = ['info', 'warn', 'error', 'debug'];
    const messages = [
      'Database query completed successfully',
      'Edge function invoked',
      'Authentication verified',
      'Cache miss, fetching from database',
      'Rate limit check passed',
      'Request processed in 145ms',
      'Connection pool expanded',
      'Webhook delivery attempted',
      'Schema reload triggered',
      'API request to external service',
    ];

    const items = Array.from({ length: 20 }, (_, i) => {
      const timestamp = new Date(Date.now() - i * 60000).toISOString();
      const randomLevel = logLevels[Math.floor(Math.random() * logLevels.length)];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      
      return {
        id: `log-${cursor || 0}-${i}`,
        timestamp,
        level: level === 'all' ? randomLevel : level,
        message: q ? `${randomMessage} [filtered by: ${q}]` : randomMessage,
        function_name: `edge-function-${Math.floor(Math.random() * 5) + 1}`,
        duration_ms: Math.floor(Math.random() * 500) + 50,
      };
    });

    // Generate next cursor for pagination
    const nextCursor = `cursor-${Date.now()}`;

    console.log('[diagnostics/logs] Returning', items.length, 'log entries');

    return new Response(
      JSON.stringify({ 
        items,
        next_cursor: nextCursor,
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('[diagnostics/logs] Error:', error);
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

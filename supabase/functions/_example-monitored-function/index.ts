/**
 * Example Edge Function with Performance Monitoring
 * 
 * This is a reference implementation showing how to integrate
 * performance monitoring into Supabase Edge Functions.
 * 
 * To use in your Edge Function:
 * 1. Copy the EdgeFunctionLogger class
 * 2. Use createMonitoredHandler wrapper
 * 3. Log metrics with logger.metric()
 */

import { serve } from 'https://deno.land/std@0.193.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple Edge Function Logger (inline version for Deno)
class EdgeFunctionLogger {
  private functionName: string;
  private startTime: number;

  constructor(functionName: string) {
    this.functionName = functionName;
    this.startTime = Date.now();
  }

  start() {
    this.startTime = Date.now();
    console.log(`[${this.functionName}] ⏱️  Started at ${new Date(this.startTime).toISOString()}`);
  }

  complete(statusCode: number) {
    const duration = Date.now() - this.startTime;
    console.log(`[${this.functionName}] ✅ Completed in ${duration}ms with status ${statusCode}`);
    
    if (duration > 5000) {
      console.warn(`[${this.functionName}] ⚠️  SLOW: Execution took ${duration}ms`);
    }
    
    return { duration, statusCode };
  }

  error(error: Error, statusCode: number = 500) {
    const duration = Date.now() - this.startTime;
    console.error(`[${this.functionName}] ❌ Error after ${duration}ms:`, error.message);
    return { duration, statusCode, error: error.message };
  }

  metric(name: string, value: number, unit: string = 'ms') {
    console.log(`[${this.functionName}] 📊 ${name}: ${value}${unit}`);
  }
}

serve(async (req) => {
  const logger = new EdgeFunctionLogger('get-leads-count-monitored');
  logger.start();

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    logger.complete(200);
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const initStart = Date.now();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    logger.metric('supabase-init', Date.now() - initStart);

    // Execute query
    const queryStart = Date.now();
    const { count, error } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });
    
    const queryDuration = Date.now() - queryStart;
    logger.metric('database-query', queryDuration);
    
    if (error) {
      logger.error(new Error(error.message), 500);
      throw error;
    }

    // Log successful completion
    const { duration, statusCode } = logger.complete(200);
    
    return new Response(
      JSON.stringify({
        success: true,
        total_leads: count,
        timestamp: new Date().toISOString(),
        performance: {
          duration_ms: duration,
          query_duration_ms: queryDuration,
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Response-Time': `${duration}ms`
        } 
      }
    );
    
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error(errorObj, 500);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorObj.message,
        function: 'get-leads-count-monitored'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Usage Pattern:
 * 
 * 1. Create logger at function start
 * 2. Call logger.start()
 * 3. Log metrics for key operations with logger.metric()
 * 4. Call logger.complete() on success or logger.error() on failure
 * 5. Include performance data in response headers
 * 
 * Benefits:
 * - Automatic timing of function execution
 * - Warning for slow executions (>5s)
 * - Detailed logging of operations
 * - Performance data in response
 * - Easy debugging and monitoring
 */

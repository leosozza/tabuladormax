import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('📜 Starting log aggregation...');

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    // 1. Sync logs
    const { data: syncLogs } = await supabase
      .from('sync_logs')
      .select('*')
      .gte('created_at', thirtyMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(100);

    // 2. Sync logs detailed
    const { data: syncLogsDetailed } = await supabase
      .from('sync_logs_detailed')
      .select('*')
      .gte('created_at', thirtyMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(100);

    // 3. Import jobs with errors
    const { data: importJobs } = await supabase
      .from('import_jobs')
      .select('*')
      .in('status', ['failed', 'error'])
      .gte('created_at', thirtyMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(50);

    // 4. Error analyses (recent)
    const { data: errorAnalyses } = await supabase
      .from('error_analyses')
      .select('*')
      .gte('created_at', thirtyMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(50);

    // Aggregate into timeline
    const timeline: any[] = [];

    syncLogs?.forEach(log => {
      timeline.push({
        timestamp: log.created_at,
        source: 'sync',
        level: log.status === 'success' ? 'info' : 'error',
        message: `${log.table_name}: ${log.status}`,
        details: log,
      });
    });

    syncLogsDetailed?.forEach(log => {
      timeline.push({
        timestamp: log.created_at,
        source: 'sync_detailed',
        level: log.status === 'success' ? 'info' : 'error',
        message: `${log.endpoint}: ${log.status}`,
        details: log,
      });
    });

    importJobs?.forEach(job => {
      timeline.push({
        timestamp: job.created_at,
        source: 'import',
        level: 'error',
        message: `Import ${job.file_name}: ${job.error_message}`,
        details: job,
      });
    });

    errorAnalyses?.forEach(err => {
      timeline.push({
        timestamp: err.created_at,
        source: 'error_analysis',
        level: 'error',
        message: `${err.error_type}: ${err.error_message}`,
        details: err,
      });
    });

    // Sort by timestamp
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Error summary
    const errorCount = timeline.filter(t => t.level === 'error').length;
    const errorsBySource: Record<string, number> = {};
    timeline.filter(t => t.level === 'error').forEach(t => {
      errorsBySource[t.source] = (errorsBySource[t.source] || 0) + 1;
    });

    const errorMessages = timeline
      .filter(t => t.level === 'error')
      .map(t => t.message);
    const mostCommon = errorMessages.length > 0 
      ? errorMessages.reduce((a, b, i, arr) => 
          arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
        )
      : 'No errors';

    console.log(`✅ Aggregated ${timeline.length} log entries`);

    return new Response(
      JSON.stringify({
        sync_logs: syncLogs || [],
        sync_logs_detailed: syncLogsDetailed || [],
        import_logs: importJobs || [],
        error_analyses: errorAnalyses || [],
        aggregated_timeline: timeline,
        error_summary: {
          total_errors: errorCount,
          by_source: errorsBySource,
          most_common: mostCommon,
        },
        aggregation_timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Log aggregation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

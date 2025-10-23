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

    console.log('🔍 Starting database inspection...');

    // 1. List all public tables
    const { data: tables, error: tablesError } = await supabase
      .rpc('list_public_tables');

    if (tablesError) throw tablesError;

    console.log(`📊 Found ${tables?.length || 0} tables`);

    // 2. Get detailed info for each table
    const tableDetails = await Promise.all(
      (tables || []).map(async (table: any) => {
        const tableName = table.table_name;
        
        // Get columns
        const { data: columns } = await supabase
          .rpc('get_table_columns', { table_name: tableName });

        // Get row count
        const { count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        // Get sample data (last 5 records)
        const { data: sampleData } = await supabase
          .from(tableName)
          .select('*')
          .order('created_at', { ascending: false, nullsFirst: false })
          .limit(5);

        return {
          name: tableName,
          row_count: count || 0,
          columns: columns || [],
          sample_data: sampleData || [],
        };
      })
    );

    // 3. Get RLS policies
    const { data: rlsPolicies } = await supabase
      .from('pg_policies')
      .select('*');

    console.log('✅ Database inspection complete');

    return new Response(
      JSON.stringify({
        tables: tableDetails,
        total_tables: tables?.length || 0,
        total_records: tableDetails.reduce((sum, t) => sum + t.row_count, 0),
        rls_policies: rlsPolicies || [],
        inspection_timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Database inspection error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

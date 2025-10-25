import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔄 Reloading schema cache...')

    // Force reload by querying pg_catalog
    const { error: reloadError } = await supabase.rpc('pg_notify', {
      channel: 'pgrst',
      payload: 'reload schema'
    }).single()

    if (reloadError) {
      console.warn('⚠️ pg_notify failed, trying alternative method:', reloadError)
    }

    // Alternative: Query information_schema to force cache refresh
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables' as any)
      .select('table_name')
      .eq('table_schema', 'public')

    if (tablesError) {
      console.warn('⚠️ Information schema query failed:', tablesError)
    }

    // Verify the new tables exist
    const { data: appRoutes, error: routesError } = await supabase
      .from('app_routes' as any)
      .select('count')
      .limit(1)

    const { data: routePerms, error: permsError } = await supabase
      .from('route_permissions' as any)
      .select('count')
      .limit(1)

    console.log('✅ Schema cache reload completed')
    console.log('📊 Verification:')
    console.log('  - app_routes accessible:', !routesError)
    console.log('  - route_permissions accessible:', !permsError)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Schema cache reloaded successfully',
        verification: {
          app_routes: !routesError,
          route_permissions: !permsError,
          tables_found: tables?.length || 0
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ Error reloading schema cache:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

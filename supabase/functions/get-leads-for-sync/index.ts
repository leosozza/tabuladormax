import { serve } from 'https://deno.land/std@0.193.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { lastSyncDate, limit = 5000 } = await req.json()
    
    console.log('get-leads-for-sync: Iniciando sincronização', { lastSyncDate, limit })
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Buscar leads com data >= lastSyncDate
    const { data, error, count } = await supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .gte('updated_at', lastSyncDate || '1970-01-01')
      .order('updated_at', { ascending: true })
      .limit(limit)
    
    if (error) {
      console.error('get-leads-for-sync: Erro ao buscar leads:', error)
      throw error
    }
    
    console.log(`get-leads-for-sync: ${data?.length || 0} leads encontrados de ${count} total`)
    
    return new Response(
      JSON.stringify({
        success: true,
        leads: data,
        total: count,
        synced_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('get-leads-for-sync: Erro geral:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

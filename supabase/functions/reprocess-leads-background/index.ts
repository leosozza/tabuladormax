import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JobParams {
  action: 'start' | 'status' | 'cancel' | 'process-batch' | 'count'
  jobId?: string
  onlyMissingFields?: boolean
  dateFrom?: string
  dateTo?: string
  batchSize?: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const params: JobParams = await req.json()
    console.log('[reprocess-leads-background] Action:', params.action)

    // ACTION: COUNT - Count leads to process
    if (params.action === 'count') {
      const { data, error } = await supabase.rpc('count_leads_to_reprocess', {
        p_only_missing_fields: params.onlyMissingFields || false,
        p_date_from: params.dateFrom || null,
        p_date_to: params.dateTo || null
      })

      if (error) throw error

      return new Response(JSON.stringify({ count: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ACTION: START - Create job and start background processing
    if (params.action === 'start') {
      // Count total leads first
      const { data: totalCount, error: countError } = await supabase.rpc('count_leads_to_reprocess', {
        p_only_missing_fields: params.onlyMissingFields || false,
        p_date_from: params.dateFrom || null,
        p_date_to: params.dateTo || null
      })

      if (countError) throw countError

      if (totalCount === 0) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Nenhum lead para processar' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Create job record
      const { data: job, error: jobError } = await supabase
        .from('lead_reprocess_jobs')
        .insert({
          status: 'running',
          total_leads: totalCount,
          processed_leads: 0,
          updated_leads: 0,
          batch_size: params.batchSize || 5000,
          only_missing_fields: params.onlyMissingFields || false,
          date_from: params.dateFrom || null,
          date_to: params.dateTo || null,
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (jobError) throw jobError

      console.log('[reprocess-leads-background] Job created:', job.id, 'Total leads:', totalCount)

      // Start background processing using waitUntil
      const processBatches = async () => {
        let lastProcessedId: number | null = null
        let totalProcessed = 0
        let totalUpdated = 0
        let hasMore = true
        let batchNumber = 0

        try {
          while (hasMore) {
            batchNumber++
            console.log(`[Job ${job.id}] Processing batch #${batchNumber}, last_id: ${lastProcessedId}`)

            // Check if job was cancelled
            const { data: currentJob } = await supabase
              .from('lead_reprocess_jobs')
              .select('status')
              .eq('id', job.id)
              .single()

            if (currentJob?.status === 'cancelled') {
              console.log(`[Job ${job.id}] Job was cancelled, stopping`)
              break
            }

            // Process batch using the SQL function
            const { data, error: batchError } = await supabase.rpc('reprocess_leads_batch', {
              p_batch_size: job.batch_size,
              p_last_processed_id: lastProcessedId,
              p_only_missing_fields: job.only_missing_fields,
              p_date_from: job.date_from,
              p_date_to: job.date_to
            })

            const batchResult = data as { 
              success: boolean; 
              processed_count: number; 
              updated_count: number; 
              last_processed_id: number | null; 
              has_more: boolean 
            }

            if (batchError) {
              console.error(`[Job ${job.id}] Batch error:`, batchError)
              throw batchError
            }

            // Update counters
            totalProcessed += batchResult.processed_count || 0
            totalUpdated += batchResult.updated_count || 0
            lastProcessedId = batchResult.last_processed_id
            hasMore = batchResult.has_more

            // Update job progress
            await supabase
              .from('lead_reprocess_jobs')
              .update({
                processed_leads: totalProcessed,
                updated_leads: totalUpdated,
                last_processed_id: lastProcessedId,
                updated_at: new Date().toISOString()
              })
              .eq('id', job.id)

            console.log(`[Job ${job.id}] Batch #${batchNumber} done: processed=${batchResult.processed_count}, updated=${batchResult.updated_count}, total_processed=${totalProcessed}`)

            // Small delay between batches to avoid overloading
            if (hasMore) {
              await new Promise(resolve => setTimeout(resolve, 100))
            }
          }

          // Mark job as completed
          await supabase
            .from('lead_reprocess_jobs')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              processed_leads: totalProcessed,
              updated_leads: totalUpdated
            })
            .eq('id', job.id)

          console.log(`[Job ${job.id}] COMPLETED! Total processed: ${totalProcessed}, updated: ${totalUpdated}`)

        } catch (error) {
          console.error(`[Job ${job.id}] Fatal error:`, error)
          
          // Mark job as failed
          await supabase
            .from('lead_reprocess_jobs')
            .update({
              status: 'failed',
              error_details: [{ message: String(error), timestamp: new Date().toISOString() }],
              completed_at: new Date().toISOString()
            })
            .eq('id', job.id)
        }
      }

      // Use EdgeRuntime.waitUntil for true background processing
      // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
      EdgeRuntime.waitUntil(processBatches())

      // Return immediately with job info
      return new Response(JSON.stringify({
        success: true,
        job: {
          id: job.id,
          status: 'running',
          total_leads: totalCount,
          message: 'Processamento iniciado em background. Você pode fechar esta página.'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ACTION: STATUS - Get job status
    if (params.action === 'status') {
      if (params.jobId) {
        // Get specific job
        const { data: job, error } = await supabase
          .from('lead_reprocess_jobs')
          .select('*')
          .eq('id', params.jobId)
          .single()

        if (error) throw error

        return new Response(JSON.stringify({ job }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } else {
        // Get all recent jobs
        const { data: jobs, error } = await supabase
          .from('lead_reprocess_jobs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) throw error

        return new Response(JSON.stringify({ jobs }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // ACTION: CANCEL - Cancel a running job
    if (params.action === 'cancel' && params.jobId) {
      const { error } = await supabase
        .from('lead_reprocess_jobs')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('id', params.jobId)
        .eq('status', 'running')

      if (error) throw error

      return new Response(JSON.stringify({ success: true, message: 'Job cancelado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[reprocess-leads-background] Error:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

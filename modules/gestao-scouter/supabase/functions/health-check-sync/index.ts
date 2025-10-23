import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  tabulador: {
    reachable: boolean;
    latency_ms: number;
    total_leads?: number;
    error?: string;
  };
  sync_queue: {
    pending: number;
    failed: number;
    oldest_pending: string | null;
  };
  last_sync: {
    timestamp: string | null;
    success: boolean;
    records: number;
  };
  recommendations: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;
    const tabuladorUrl = Deno.env.get('TABULADOR_URL');
    const tabuladorKey = Deno.env.get('TABULADOR_SERVICE_KEY');
    const tabuladorPublishableKey = Deno.env.get('TABULADOR_PUBLISHABLE_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    const result: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      tabulador: {
        reachable: false,
        latency_ms: 0,
      },
      sync_queue: {
        pending: 0,
        failed: 0,
        oldest_pending: null,
      },
      last_sync: {
        timestamp: null,
        success: false,
        records: 0,
      },
      recommendations: [],
    };

    // 1. Check TabuladorMax connectivity (with Edge Function fallback)
    if (tabuladorUrl && tabuladorKey) {
      const tabuladorStart = Date.now();
      try {
        // Tentar chamar Edge Function get-leads-for-sync primeiro
        let countResponse = await fetch(
          `${tabuladorUrl}/functions/v1/get-leads-for-sync`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${tabuladorKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        result.tabulador.latency_ms = Date.now() - tabuladorStart;

        // Se Edge Function não existe (404) ou não autorizada (401), testar REST API
        if (countResponse.status === 404 || countResponse.status === 401) {
          console.log('⚠️ Edge Function não disponível, testando REST API com publishable_key...');
          
          if (!tabuladorPublishableKey) {
            throw new Error('TABULADOR_PUBLISHABLE_KEY não configurado');
          }
          
          const restResponse = await fetch(
            `${tabuladorUrl}/rest/v1/leads?select=id&limit=1`,
            {
              method: 'HEAD',
              headers: {
                'apikey': tabuladorPublishableKey,
                'Authorization': `Bearer ${tabuladorPublishableKey}`,
              },
            }
          );

          if (restResponse.ok) {
            result.tabulador.reachable = true;
            result.recommendations.push(
              '⚠️ Edge Functions não configuradas no TabuladorMax - usando REST API (mais lento)'
            );
            result.status = 'degraded';
          } else {
            throw new Error(`REST API falhou: HTTP ${restResponse.status}`);
          }
        } else if (countResponse.ok) {
          const data = await countResponse.json();
          result.tabulador.reachable = true;
          result.tabulador.total_leads = data.total_leads;
          result.recommendations.push(
            `✅ ${(data.total_leads || 0).toLocaleString('pt-BR')} leads disponíveis no TabuladorMax`
          );
        } else {
          const errorText = await countResponse.text();
          result.tabulador.error = `HTTP ${countResponse.status}: ${errorText}`;
          result.recommendations.push('❌ Erro ao conectar com TabuladorMax');
          result.status = 'degraded';
        }
      } catch (error) {
        result.tabulador.error = error instanceof Error ? error.message : 'Connection failed';
        result.recommendations.push('❌ TabuladorMax inacessível - verificar URL e secrets');
        result.status = 'down';
      }
    } else {
      result.tabulador.error = 'Configuração incompleta';
      result.recommendations.push('Configurar TABULADOR_URL e TABULADOR_SERVICE_KEY nos secrets');
      result.status = 'degraded';
    }

    // 2. Check sync_queue status
    try {
      const { data: queueStats } = await supabase
        .from('sync_queue')
        .select('status, created_at')
        .in('status', ['pending', 'failed']);

      const pending = queueStats?.filter(q => q.status === 'pending') || [];
      const failed = queueStats?.filter(q => q.status === 'failed') || [];

      result.sync_queue.pending = pending.length;
      result.sync_queue.failed = failed.length;

      if (pending.length > 0) {
        result.sync_queue.oldest_pending = pending.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )[0].created_at;

        // Check if oldest pending is older than 5 minutes
        const oldestDate = new Date(result.sync_queue.oldest_pending);
        if (Date.now() - oldestDate.getTime() > 5 * 60 * 1000) {
          result.recommendations.push(`${pending.length} registros pendentes há mais de 5 minutos - verificar cron job`);
          result.status = result.status === 'healthy' ? 'degraded' : result.status;
        }
      }

      if (failed.length > 0) {
        result.recommendations.push(`${failed.length} registros falharam na sincronização - verificar logs`);
        result.status = result.status === 'healthy' ? 'degraded' : result.status;
      }
    } catch (error) {
      console.error('Erro ao verificar sync_queue:', error);
      result.recommendations.push('Tabela sync_queue não encontrada - executar migration');
      result.status = 'down';
    }

    // 3. Check last sync
    const { data: lastSync } = await supabase
      .from('sync_status')
      .select('*')
      .eq('project_name', 'TabuladorMax')
      .maybeSingle();

    if (lastSync) {
      result.last_sync = {
        timestamp: lastSync.last_sync_at,
        success: lastSync.last_sync_success || false,
        records: lastSync.total_records || 0,
      };

      if (lastSync.last_sync_at) {
        const lastSyncDate = new Date(lastSync.last_sync_at);
        const hoursSinceSync = (Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60);

        if (hoursSinceSync > 24) {
          result.recommendations.push('Última sincronização há mais de 24h - verificar webhook do TabuladorMax');
          result.status = result.status === 'healthy' ? 'degraded' : result.status;
        }
      }

      if (!lastSync.last_sync_success) {
        result.recommendations.push(`Última sincronização falhou: ${lastSync.last_error || 'Erro desconhecido'}`);
        result.status = 'degraded';
      }
    } else {
      result.recommendations.push('Nenhuma sincronização registrada - aguardando primeiro envio do TabuladorMax');
    }

    // Log diagnostics
    await supabase.from('sync_logs_detailed').insert({
      endpoint: 'health-check-sync',
      table_name: 'diagnostic',
      status: result.status === 'healthy' ? 'success' : 'error',
      execution_time_ms: Date.now() - startTime,
      response_data: result,
      created_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: result.status === 'healthy' ? 200 : result.status === 'degraded' ? 206 : 503,
    });

  } catch (error) {
    console.error('❌ Health check fatal error:', error);
    
    return new Response(JSON.stringify({
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 503,
    });
  }
});

/**
 * Edge Function: Processar fila de sincronização
 * Executa periodicamente (ex: a cada 1 minuto) via cron job
 * 
 * Processa registros na fila (fichas ou leads) e exporta para TabuladorMax
 * com retry exponencial e logging detalhado.
 */
import { serve } from "https://deno.land/std@0.193.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueueItem {
  id: string;
  table_name?: string;
  row_id?: string;
  ficha_id?: number;
  operation: string;
  payload: Record<string, any>;
  retry_count: number;
  status: string;
}

/**
 * Normaliza data para formato ISO string
 */
function normalizeDate(dateValue: unknown): string | null {
  if (!dateValue) return null;
  try {
    const date = new Date(dateValue as string | number);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

/**
 * Extrai data de atualização com fallback para outros campos
 */
function getUpdatedAtDate(record: Record<string, unknown>): string {
  // Prioridade: updated_at -> updated -> modificado -> criado -> now
  const dateValue = record.updated_at || record.updated || record.modificado || record.criado;
  return normalizeDate(dateValue) || new Date().toISOString();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Criar clientes Supabase
    const gestaoUrl = Deno.env.get('SUPABASE_URL') || '';
    const gestaoKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || '';
    const gestao = createClient(gestaoUrl, gestaoKey);

    const tabuladorUrl = Deno.env.get('TABULADOR_URL') || '';
    const tabuladorKey = Deno.env.get('TABULADOR_SERVICE_KEY') || '';
    
    if (!tabuladorUrl || !tabuladorKey) {
      console.log('⚠️ TabuladorMax não configurado, pulando sincronização');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'TabuladorMax não configurado',
          processed: 0 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const tabulador = createClient(tabuladorUrl, tabuladorKey);

    // Buscar itens pendentes da fila (até 100 por vez)
    const maxRetries = Number(Deno.env.get('SYNC_MAX_RETRIES') || '5');
    const { data: queueItems, error: queueError } = await gestao
      .from('sync_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('retry_count', maxRetries)
      .order('created_at', { ascending: true })
      .limit(100);

    if (queueError) {
      throw new Error(`Erro ao buscar fila: ${queueError.message}`);
    }

    if (!queueItems || queueItems.length === 0) {
      console.log('ℹ️ Nenhum item na fila para processar');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhum item na fila',
          processed: 0 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`📋 Processando ${queueItems.length} itens da fila`);

    let succeeded = 0;
    let failed = 0;
    const errorDetails: string[] = [];

    // Processar cada item
    for (const item of queueItems as QueueItem[]) {
      try {
        // Default agora é 'leads' (fonte única). 
        const tableName = 'leads';
        const recordId = item.row_id || item.ficha_id || item.payload?.id;
        
        console.log(`🔄 Processando item ${item.id} - tabela: ${tableName}, id: ${recordId}`);

        // Marcar como processando (best-effort)
        await gestao
          .from('sync_queue')
          .update({ status: 'processing' })
          .eq('id', item.id);

        // Preparar dados para sincronizar (mapear campos do payload)
        const dataToSync: Record<string, unknown> = {
          id: item.payload.id,
          nome: item.payload.nome,
          telefone: item.payload.telefone,
          email: item.payload.email,
          idade: item.payload.idade,
          projeto: item.payload.projeto,
          scouter: item.payload.scouter,
          supervisor: item.payload.supervisor,
          localizacao: item.payload.localizacao,
          latitude: item.payload.latitude,
          longitude: item.payload.longitude,
          local_da_abordagem: item.payload.local_da_abordagem,
          criado: normalizeDate(item.payload.criado),
          valor_ficha: item.payload.valor_ficha,
          etapa: item.payload.etapa,
          ficha_confirmada: item.payload.ficha_confirmada,
          foto: item.payload.foto,
          modelo: item.payload.modelo,
          tabulacao: item.payload.tabulacao,
          agendado: item.payload.agendado,
          compareceu: item.payload.compareceu,
          confirmado: item.payload.confirmado,
          updated_at: getUpdatedAtDate(item.payload)
        };

        // Executar operação no TabuladorMax
        let syncError: any;
        
        if (item.operation === 'delete' || item.operation === 'DELETE') {
          // DELETE operation
          const { error } = await tabulador
            .from('leads')
            .delete()
            .eq('id', recordId);
          syncError = error;
        } else {
          // INSERT/UPDATE operation (upsert)
          const { error } = await tabulador
            .from('leads')
            .upsert([dataToSync], { onConflict: 'id' });
          syncError = error;
        }

        if (syncError) {
          throw syncError;
        }

        // Atualizar registro local com informação de sincronização (sempre na tabela leads)
        await gestao
          .from('leads')
          .update({ 
            last_synced_at: new Date().toISOString(),
            sync_source: 'Gestao'
          })
          .eq('id', recordId);

        // Marcar como completo
        await gestao
          .from('sync_queue')
          .update({ 
            status: 'completed',
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id);

        succeeded++;
        console.log(`✅ Item ${item.id} processado com sucesso`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Erro ao processar item ${item.id}:`, errorMessage);
        errorDetails.push(`Item ${item.id}: ${errorMessage}`);

        // Calcular backoff exponencial (opcional: se a tabela tiver next_attempt_at)
        const retryCount = (item.retry_count ?? 0) + 1;
        const shouldRetry = retryCount < maxRetries;

        // Marcar como falho ou pendente para retry
        await gestao
          .from('sync_queue')
          .update({ 
            status: shouldRetry ? 'pending' : 'failed',
            retry_count: retryCount,
            last_error: errorMessage,
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id);

        failed++;
      }
    }

    // Registrar logs
    try {
      // Log detalhado
      await gestao
        .from('sync_logs_detailed')
        .insert({
          endpoint: 'process-sync-queue',
          table_name: 'leads',
          status: failed === 0 ? 'success' : (succeeded > 0 ? 'warning' : 'error'),
          records_count: succeeded,
          execution_time_ms: Date.now() - startTime,
          response_data: { total_items: queueItems.length, succeeded, failed },
          error_message: errorDetails.length > 0 ? errorDetails.join('; ') : null,
          metadata: {
            source: 'sync_queue',
            total_items: queueItems.length,
            succeeded,
            failed,
            max_retries: maxRetries
          }
        });

      // Log geral
      const { error: logError } = await gestao
        .from('sync_logs')
        .insert({
          sync_direction: 'gestao_to_tabulador',
          records_synced: succeeded,
          records_failed: failed,
          errors: failed > 0 ? { message: `${failed} itens falharam`, details: errorDetails } : null,
          started_at: new Date(startTime).toISOString(),
          completed_at: new Date().toISOString(),
          processing_time_ms: Date.now() - startTime,
          metadata: {
            source: 'sync_queue',
            total_items: queueItems.length,
            succeeded,
            failed
          }
        });
      
      if (logError) {
        console.error('Erro ao registrar log de sincronização:', logError);
      }
    } catch (error) {
      console.error('Erro ao inserir logs:', error);
    }

    const result = {
      success: failed === 0,
      processed: queueItems.length,
      succeeded,
      failed,
      processing_time_ms: Date.now() - startTime
    };

    console.log(`✅ Processamento da fila concluído:`, result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Erro fatal:', message);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: message,
        processing_time_ms: Date.now() - startTime
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
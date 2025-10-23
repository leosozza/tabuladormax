/**
 * Edge Function: Exportar dados em lote para TabuladorMax
 * Endpoint: POST /tabulador-export
 * 
 * Funcionalidades:
 * - Exportar fichas em lote para TabuladorMax
 * - Suportar filtros (data, scouter, projeto)
 * - Processar em batches para evitar timeout
 * - Registrar logs de exportação
 * - Retornar status detalhado
 */
import { serve } from "https://deno.land/std@0.193.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ExportRequest {
  api_key?: string;
  filters?: {
    updated_since?: string;
    scouter?: string;
    projeto?: string;
    ids?: string[];
  };
  batch_size?: number;
  dry_run?: boolean; // Se true, apenas retorna quantos seriam exportados
}

interface ExportResult {
  success: boolean;
  total_records: number;
  exported: number;
  failed: number;
  skipped: number;
  error_details: any[];
  processing_time_ms: number;
  dry_run?: boolean;
}

/**
 * Mapeia uma ficha (Gestão Scouter) para um lead (TabuladorMax)
 */
function mapFichaToLead(ficha: any): any {
  return {
    id: ficha.id,
    nome: ficha.nome,
    telefone: ficha.telefone,
    email: ficha.email,
    idade: ficha.idade,
    projeto: ficha.projeto,
    scouter: ficha.scouter,
    supervisor: ficha.supervisor,
    localizacao: ficha.localizacao,
    latitude: ficha.latitude,
    longitude: ficha.longitude,
    local_da_abordagem: ficha.local_da_abordagem,
    criado: ficha.criado ? new Date(ficha.criado).toISOString() : null,
    valor_ficha: ficha.valor_ficha,
    etapa: ficha.etapa,
    ficha_confirmada: ficha.ficha_confirmada,
    foto: ficha.foto,
    modelo: ficha.modelo,
    tabulacao: ficha.tabulacao,
    agendado: ficha.agendado,
    compareceu: ficha.compareceu,
    confirmado: ficha.confirmado,
    cadastro_existe_foto: ficha.cadastro_existe_foto,
    presenca_confirmada: ficha.presenca_confirmada,
    updated_at: ficha.updated_at || new Date().toISOString()
  };
}

/**
 * Verifica autenticação via API key
 */
function validateApiKey(apiKey: string | null): boolean {
  const validApiKey = Deno.env.get('GESTAO_API_KEY');
  
  if (!validApiKey) {
    console.warn('GESTAO_API_KEY não configurada');
    return true; // Permitir em dev se não configurada
  }
  
  return apiKey === validApiKey;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const errorDetails: any[] = [];

  try {
    // Verificar método HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido. Use POST.' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse do body
    const request: ExportRequest = await req.json();

    // Validar API key
    const apiKey = req.headers.get('x-api-key') || request.api_key;
    if (!apiKey || !validateApiKey(apiKey)) {
      return new Response(
        JSON.stringify({ 
          error: 'API key inválida',
          hint: 'Forneça uma API key válida no header x-api-key ou no corpo da requisição'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`📤 Iniciando exportação para TabuladorMax`);
    if (request.dry_run) {
      console.log('🔍 Modo dry-run ativado');
    }

    // Criar clientes Supabase
    const gestaoUrl = Deno.env.get('SUPABASE_URL') || '';
    const gestaoKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || '';
    const gestao = createClient(gestaoUrl, gestaoKey);

    const tabuladorUrl = Deno.env.get('TABULADOR_URL') || '';
    const tabuladorKey = Deno.env.get('TABULADOR_SERVICE_KEY') || '';
    const tabulador = createClient(tabuladorUrl, tabuladorKey);

    if (!tabuladorUrl || !tabuladorKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Configuração do TabuladorMax não encontrada',
          hint: 'Configure TABULADOR_URL e TABULADOR_SERVICE_KEY'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Construir query com filtros
    let query = gestao
      .from('leads')
      .select('*')
      .or('deleted.is.false,deleted.is.null');

    if (request.filters?.updated_since) {
      query = query.gte('updated_at', request.filters.updated_since);
    }

    if (request.filters?.scouter) {
      query = query.eq('scouter', request.filters.scouter);
    }

    if (request.filters?.projeto) {
      query = query.eq('projeto', request.filters.projeto);
    }

    if (request.filters?.ids && request.filters.ids.length > 0) {
      query = query.in('id', request.filters.ids);
    }

    // Buscar fichas para exportar
    const { data: fichas, error: fetchError } = await query.order('updated_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Erro ao buscar fichas: ${fetchError.message}`);
    }

    if (!fichas || fichas.length === 0) {
      console.log('ℹ️ Nenhuma ficha encontrada para exportar');
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhuma ficha encontrada para exportar',
          total_records: 0,
          exported: 0,
          failed: 0
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`📊 Encontradas ${fichas.length} fichas para exportar`);

    // Se for dry-run, retornar apenas contagem
    if (request.dry_run) {
      return new Response(
        JSON.stringify({
          success: true,
          dry_run: true,
          total_records: fichas.length,
          message: `${fichas.length} fichas seriam exportadas`,
          sample_ids: fichas.slice(0, 5).map(f => f.id)
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Mapear fichas para leads
    const leadsToExport = fichas.map(mapFichaToLead);

    let exported = 0;
    let failed = 0;
    let skipped = 0;

    // Processar em lotes para evitar timeout
    const BATCH_SIZE = request.batch_size || 500;
    
    for (let i = 0; i < leadsToExport.length; i += BATCH_SIZE) {
      const batch = leadsToExport.slice(i, i + BATCH_SIZE);
      
      try {
        console.log(`📦 Processando lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(leadsToExport.length / BATCH_SIZE)}`);
        
        // Verificar quais já existem no TabuladorMax
        const ids = batch.map(l => l.id);
        const { data: existingLeads } = await tabulador
          .from('leads')
          .select('id, updated_at')
          .in('id', ids);

        const existingMap = new Map(existingLeads?.map(l => [l.id, l.updated_at]) || []);

        // Filtrar apenas os que precisam ser atualizados
        const toUpsert = [];
        
        for (const lead of batch) {
          const existingTimestamp = existingMap.get(lead.id);
          
          if (!existingTimestamp) {
            // Novo registro
            toUpsert.push(lead);
          } else {
            // Comparar timestamps
            const existingTime = new Date(existingTimestamp).getTime();
            const newTime = new Date(lead.updated_at).getTime();
            
            if (newTime > existingTime) {
              toUpsert.push(lead);
            } else {
              skipped++;
            }
          }
        }

        // Fazer upsert no TabuladorMax
        if (toUpsert.length > 0) {
          const { data, error } = await tabulador
            .from('leads')
            .upsert(toUpsert, { onConflict: 'id' })
            .select('id');

          if (error) {
            console.error('Erro ao exportar lote:', error);
            errorDetails.push({
              batch_start: i,
              batch_size: toUpsert.length,
              error: error.message
            });
            failed += toUpsert.length;
          } else {
            exported += data?.length || 0;
            console.log(`✅ Exportados ${data?.length || 0} registros`);
          }
        }

      } catch (error) {
        console.error(`Erro ao processar lote ${i}-${i + BATCH_SIZE}:`, error);
        errorDetails.push({
          batch_start: i,
          batch_size: batch.length,
          error: error instanceof Error ? error.message : String(error)
        });
        failed += batch.length;
      }
    }

    // Registrar log de sincronização
    const processingTime = Date.now() - startTime;
    
    await gestao
      .from('sync_logs')
      .insert({
        sync_direction: 'gestao_to_tabulador',
        records_synced: exported,
        records_failed: failed,
        errors: errorDetails.length > 0 ? { errors: errorDetails } : null,
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
        processing_time_ms: processingTime,
        metadata: {
          total_records: fichas.length,
          exported,
          failed,
          skipped,
          filters: request.filters
        }
      });

    // Atualizar status de sincronização
    await gestao
      .from('sync_status')
      .upsert({
        project_name: 'gestao_scouter',
        last_sync_at: new Date().toISOString(),
        last_sync_success: failed === 0,
        total_records: exported,
        last_error: errorDetails.length > 0 ? JSON.stringify(errorDetails.slice(0, 5)) : null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'project_name' });

    const result: ExportResult = {
      success: failed === 0,
      total_records: fichas.length,
      exported,
      failed,
      skipped,
      error_details: errorDetails.slice(0, 10),
      processing_time_ms: processingTime
    };

    console.log(`✅ Exportação concluída:`, result);

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
    
    const result: ExportResult = {
      success: false,
      total_records: 0,
      exported: 0,
      failed: 0,
      skipped: 0,
      error_details: [{ error: message }],
      processing_time_ms: Date.now() - startTime
    };

    return new Response(
      JSON.stringify(result),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

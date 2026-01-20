// Edge Function para sincronizar leads que estão no Bitrix mas não no banco
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BITRIX_BASE_URL = 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr';

// Fetch com retry para erros de conexão HTTP/2
async function fetchWithRetry(url: string, options?: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error: any) {
      lastError = error;
      const isConnectionError = error?.message?.includes('http2') || 
                                 error?.message?.includes('connection') ||
                                 error?.message?.includes('SendRequest');
      
      if (isConnectionError && attempt < maxRetries) {
        console.log(`⚠️ Erro de conexão (tentativa ${attempt}/${maxRetries}), aguardando...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Backoff progressivo
        continue;
      }
      throw error;
    }
  }
  
  throw lastError;
}

// Função para parsear datas brasileiras
const parseBrazilianDate = (dateStr: string | null | undefined): string | null => {
  if (!dateStr) return null;
  try {
    const matchFull = String(dateStr).match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (matchFull) {
      const [, day, month, year, hour, minute, second] = matchFull;
      return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
    }
    const matchDate = String(dateStr).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (matchDate) {
      const [, day, month, year] = matchDate;
      return `${year}-${month}-${day}T00:00:00Z`;
    }
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    return null;
  } catch {
    return null;
  }
};

// Converte moeda do Bitrix
function convertBitrixMoney(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const valueStr = String(value).trim();
  if (valueStr.includes('|')) {
    const parsed = parseFloat(valueStr.split('|')[0].trim());
    return isNaN(parsed) ? null : parsed;
  }
  const parsed = parseFloat(valueStr);
  return isNaN(parsed) ? null : parsed;
}

// Resolver SPA entity name
async function resolveSpaEntityName(
  supabase: any,
  entityTypeId: number,
  bitrixItemId: number | null
): Promise<string | null> {
  if (!bitrixItemId) return null;
  const { data } = await supabase
    .from('bitrix_spa_entities')
    .select('title')
    .eq('entity_type_id', entityTypeId)
    .eq('bitrix_item_id', bitrixItemId)
    .maybeSingle();
  return data?.title?.trim() || null;
}

// Helper para obter data de "hoje" no timezone do Brasil
function getTodayBrazil(): string {
  const now = new Date();
  const brasilOffset = -3 * 60;
  const localOffset = now.getTimezoneOffset();
  const diff = brasilOffset - localOffset;
  const brasilNow = new Date(now.getTime() + diff * 60 * 1000);
  return brasilNow.toISOString().split('T')[0];
}

// Mapeia SOURCE_ID para uma descrição legível quando SOURCE_DESCRIPTION está vazio
function mapSourceId(sourceId: string | null | undefined): string | null {
  if (!sourceId) return null;
  const mapping: Record<string, string> = {
    'CALL': 'Ligação Receptivo',
    'WEBFORM': 'Meta',
    'CALLBACK': 'Callback',
    'RC_GENERATOR': 'Gerador RC',
    'STORE': 'Loja',
    'OTHER': 'Outros',
    'SELF': 'Manual',
    'RECOMMENDATION': 'Indicação',
    'TRADE_SHOW': 'Feira',
    'WEB': 'Web',
    'ADVERTISING': 'Publicidade',
    'PARTNER': 'Parceiro',
    'EMAIL': 'Email'
  };
  return mapping[sourceId] || sourceId;
}

// Atualizar heartbeat do job
async function updateHeartbeat(supabase: any, jobId: string, updates: Record<string, any> = {}) {
  await supabase.from('missing_leads_sync_jobs').update({
    last_heartbeat_at: new Date().toISOString(),
    ...updates
  }).eq('id', jobId);
}

// Verificar se job foi cancelado
async function isJobCancelled(supabase: any, jobId: string): Promise<boolean> {
  const { data } = await supabase
    .from('missing_leads_sync_jobs')
    .select('status')
    .eq('id', jobId)
    .single();
  return data?.status === 'cancelled';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const { action } = body;

    // AÇÃO: Cancelar job
    if (action === 'cancel') {
      const { jobId } = body;
      if (!jobId) {
        return new Response(
          JSON.stringify({ error: 'jobId é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('missing_leads_sync_jobs')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .in('status', ['running', 'pending']);

      if (error) throw error;

      console.log(`🚫 Job ${jobId} cancelado`);
      return new Response(
        JSON.stringify({ success: true, message: 'Job cancelado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // AÇÃO: Excluir job
    if (action === 'delete') {
      const { jobId } = body;
      if (!jobId) {
        return new Response(
          JSON.stringify({ error: 'jobId é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Só pode excluir jobs finalizados
      const { error } = await supabase
        .from('missing_leads_sync_jobs')
        .delete()
        .eq('id', jobId)
        .in('status', ['completed', 'failed', 'cancelled']);

      if (error) throw error;

      console.log(`🗑️ Job ${jobId} excluído`);
      return new Response(
        JSON.stringify({ success: true, message: 'Job excluído' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // AÇÃO: Marcar job travado como falho
    if (action === 'terminate') {
      const { jobId } = body;
      if (!jobId) {
        return new Response(
          JSON.stringify({ error: 'jobId é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('missing_leads_sync_jobs')
        .update({
          status: 'failed',
          error_details: [{ error: 'Job marcado como falho manualmente (timeout)', timestamp: new Date().toISOString() }],
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .eq('status', 'running');

      if (error) throw error;

      console.log(`⚠️ Job ${jobId} marcado como falho`);
      return new Response(
        JSON.stringify({ success: true, message: 'Job marcado como falho' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // AÇÃO PADRÃO: Sincronizar
    let { scouterName, dateFrom, dateTo, batchSize = 10 } = body;
    let jobId: string | null = null;

    // Se não informar datas E não informar scouter, default para "hoje"
    if (!dateFrom && !dateTo && (!scouterName || !scouterName.trim())) {
      const today = getTodayBrazil();
      dateFrom = today;
      dateTo = today;
      console.log(`📅 Datas não informadas - usando padrão "hoje" (${today})`);
    }

    // Criar registro do job no início
    const { data: job, error: jobError } = await supabase
      .from('missing_leads_sync_jobs')
      .insert({
        status: 'running',
        stage: 'listing_bitrix',
        scouter_name: scouterName?.trim() || null,
        date_from: dateFrom || null,
        date_to: dateTo || null,
        started_at: new Date().toISOString(),
        last_heartbeat_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError) {
      console.error('❌ Erro ao criar job:', jobError);
    } else {
      jobId = job.id;
      console.log(`📝 Job criado: ${jobId}`);
    }

    // scouterName é opcional - se não informado, busca todos
    let scouterBitrixId: number | null = null;
    let scouterLabel = 'TODOS';

    if (scouterName && scouterName.trim()) {
      console.log(`🔍 Buscando leads faltantes para scouter: ${scouterName}`);

      const { data: spaData } = await supabase
        .from('bitrix_spa_entities')
        .select('bitrix_item_id')
        .eq('entity_type_id', 1096)
        .ilike('title', `%${scouterName.trim()}%`)
        .maybeSingle();

      if (!spaData) {
        if (jobId) {
          await supabase.from('missing_leads_sync_jobs').update({
            status: 'failed',
            error_details: [{ error: `Scouter "${scouterName}" não encontrado` }],
            completed_at: new Date().toISOString()
          }).eq('id', jobId);
        }
        return new Response(
          JSON.stringify({ error: `Scouter "${scouterName}" não encontrado no sistema` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      scouterBitrixId = spaData.bitrix_item_id;
      scouterLabel = scouterName.trim();
      console.log(`📌 Scouter ID no Bitrix: ${scouterBitrixId}`);
    } else {
      console.log(`🔍 Buscando TODOS os leads faltantes (sem filtro de scouter)`);
    }

    // Buscar todos os IDs do Bitrix
    const allBitrixIds: number[] = [];
    let start = 0;
    let hasMore = true;

    while (hasMore) {
      // Verificar cancelamento antes de cada iteração
      if (jobId && await isJobCancelled(supabase, jobId)) {
        console.log(`🚫 Job ${jobId} foi cancelado durante listagem`);
        return new Response(
          JSON.stringify({ success: false, message: 'Job cancelado', jobId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Construir URL no formato correto para API Bitrix
      let url = `${BITRIX_BASE_URL}/crm.lead.list.json?select[]=ID&order[ID]=DESC&start=${start}`;

      // Adicionar filtros dinamicamente
      if (scouterBitrixId) {
        url += `&filter[PARENT_ID_1096]=${scouterBitrixId}`;
      }
      if (dateFrom) {
        // Formato ISO: YYYY-MM-DDTHH:MM:SS para que o Bitrix interprete corretamente
        url += `&filter[>=DATE_CREATE]=${encodeURIComponent(dateFrom + 'T00:00:00')}`;
      }
      if (dateTo) {
        // Incluir dateTo: usar < dia seguinte às 00:00:00
        const toDate = new Date(dateTo + 'T00:00:00');
        toDate.setDate(toDate.getDate() + 1);
        const nextDay = toDate.toISOString().split('T')[0];
        url += `&filter[<DATE_CREATE]=${encodeURIComponent(nextDay + 'T00:00:00')}`;
      }

      console.log(`🔗 URL Bitrix: ${url.substring(0, 120)}...`);
      const response = await fetchWithRetry(url);
      const result = await response.json();

      if (result.error) {
        console.error('❌ Erro na API do Bitrix:', result.error);
        throw new Error(`Erro Bitrix: ${result.error_description || result.error}`);
      }

      const leads = result.result || [];
      for (const lead of leads) {
        allBitrixIds.push(Number(lead.ID));
      }

      // Heartbeat a cada página
      if (jobId && allBitrixIds.length % 500 === 0) {
        await updateHeartbeat(supabase, jobId, {
          scanned_count: allBitrixIds.length,
          cursor_start: start
        });
      }

      // Verificar se há mais páginas
      if (result.next) {
        start = result.next;
      } else {
        hasMore = false;
      }

      // Limites de segurança
      const hasDateFilter = dateFrom || dateTo;
      const maxLimit = hasDateFilter ? 50000 : (scouterBitrixId ? 2000 : 5000);
      if (allBitrixIds.length > maxLimit) {
        console.log(`⚠️ Limite de ${maxLimit} leads atingido`);
        hasMore = false;
      }
    }

    console.log(`📋 Total de leads no Bitrix para ${scouterLabel}: ${allBitrixIds.length}`);

    // Atualizar job com total do Bitrix e mudar stage
    if (jobId) {
      await updateHeartbeat(supabase, jobId, {
        bitrix_total: allBitrixIds.length,
        scanned_count: allBitrixIds.length,
        stage: 'comparing'
      });
    }

    if (allBitrixIds.length === 0) {
      if (jobId) {
        await supabase.from('missing_leads_sync_jobs').update({
          status: 'completed',
          stage: 'completed',
          bitrix_total: 0,
          db_total: 0,
          missing_count: 0,
          synced_count: 0,
          error_count: 0,
          completed_at: new Date().toISOString()
        }).eq('id', jobId);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          jobId,
          message: 'Nenhum lead encontrado no Bitrix com os filtros especificados',
          bitrixTotal: 0,
          dbTotal: 0,
          missing: 0,
          synced: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar quais IDs já existem no banco (paginado para evitar limite de 1000)
    const existingIds = new Set<number>();
    const chunkSize = 500;
    
    for (let i = 0; i < allBitrixIds.length; i += chunkSize) {
      const chunk = allBitrixIds.slice(i, i + chunkSize);
      const { data: chunkLeads } = await supabase
        .from('leads')
        .select('id')
        .in('id', chunk);
      
      (chunkLeads || []).forEach((l: { id: number }) => existingIds.add(l.id));
    }
    
    const missingIds = allBitrixIds.filter(id => !existingIds.has(id));

    console.log(`📊 Leads no banco: ${existingIds.size} | Faltantes: ${missingIds.length}`);

    // Atualizar job com contagem do banco e faltantes
    if (jobId) {
      await updateHeartbeat(supabase, jobId, {
        db_total: existingIds.size,
        missing_count: missingIds.length,
        stage: 'importing'
      });
    }

    if (missingIds.length === 0) {
      if (jobId) {
        await supabase.from('missing_leads_sync_jobs').update({
          status: 'completed',
          stage: 'completed',
          bitrix_total: allBitrixIds.length,
          db_total: existingIds.size,
          missing_count: 0,
          synced_count: 0,
          error_count: 0,
          completed_at: new Date().toISOString()
        }).eq('id', jobId);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          jobId,
          message: 'Todos os leads já estão sincronizados',
          bitrixTotal: allBitrixIds.length,
          dbTotal: existingIds.size,
          missing: 0,
          synced: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar e importar os leads faltantes em batches
    const batches: number[][] = [];
    for (let i = 0; i < missingIds.length; i += batchSize) {
      batches.push(missingIds.slice(i, i + batchSize));
    }

    let synced = 0;
    let errors = 0;
    const errorDetails: any[] = [];

    let batchIndex = 0;
    for (const batch of batches) {
      batchIndex++;

      // Verificar cancelamento antes de cada batch
      if (jobId && await isJobCancelled(supabase, jobId)) {
        console.log(`🚫 Job ${jobId} foi cancelado durante importação`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Job cancelado durante importação', 
            jobId,
            synced,
            errors
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`📦 Processando batch ${batchIndex}/${batches.length} (${batch.length} leads)...`);

      // Buscar leads do Bitrix em batch
      const batchCommands: Record<string, string> = {};
      batch.forEach((id, idx) => {
        batchCommands[`get_${idx}`] = `crm.lead.get?ID=${id}`;
      });

      try {
        const bitrixResponse = await fetchWithRetry(`${BITRIX_BASE_URL}/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ halt: 0, cmd: batchCommands })
        });

        const batchResult = await bitrixResponse.json();

        if (!batchResult?.result?.result) {
          console.error('❌ Erro na resposta batch do Bitrix');
          errors += batch.length;
          continue;
        }

        // Processar cada lead
        for (let i = 0; i < batch.length; i++) {
          const leadId = batch[i];
          const leadData = batchResult.result.result[`get_${i}`];

          if (!leadData) {
            console.warn(`⚠️ Lead ${leadId} não encontrado no Bitrix`);
            errors++;
            continue;
          }

          try {
            // Resolver SPAs - CORRIGIDO: PARENT_ID_1120 para projetos comerciais (não 1154)
            const scouterId = leadData.PARENT_ID_1096 ? Number(leadData.PARENT_ID_1096) : null;
            const telemarketingId = leadData.PARENT_ID_1144 ? Number(leadData.PARENT_ID_1144) : null;
            const projectBitrixId = leadData.PARENT_ID_1120 ? Number(leadData.PARENT_ID_1120) : null;

            const [resolvedScouterName, telemarketingName, projetoName] = await Promise.all([
              resolveSpaEntityName(supabase, 1096, scouterId),
              resolveSpaEntityName(supabase, 1144, telemarketingId),
              resolveSpaEntityName(supabase, 1120, projectBitrixId)
            ]);

            // Fallback para scouter quando ID existe mas nome não foi resolvido
            let finalScouterName = resolvedScouterName;
            if (!resolvedScouterName && scouterId) {
              finalScouterName = `Scouter ID ${scouterId}`;
              console.log(`⚠️ Scouter ${scouterId} não encontrado no cache, usando fallback`);
            }

            // Resolver projeto comercial pelo code (bitrix_item_id)
            let commercialProjectId: string | null = null;
            if (projectBitrixId) {
              const { data: project } = await supabase
                .from('commercial_projects')
                .select('id')
                .eq('code', String(projectBitrixId))
                .eq('active', true)
                .maybeSingle();
              commercialProjectId = project?.id || null;
              
              if (!commercialProjectId) {
                console.warn(`⚠️ Projeto comercial code=${projectBitrixId} não encontrado`);
              }
            }

            // Mapear fonte - priorizar SOURCE_DESCRIPTION, depois SOURCE_ID
            const fonteValue = leadData.SOURCE_DESCRIPTION 
              ? leadData.SOURCE_DESCRIPTION 
              : mapSourceId(leadData.SOURCE_ID);

            // Parsear data sem fallback perigoso
            const parsedCriado = parseBrazilianDate(leadData.DATE_CREATE);
            if (!parsedCriado) {
              console.warn(`⚠️ Lead ${leadId}: DATE_CREATE inválido "${leadData.DATE_CREATE}" - usando null`);
            }

            // Mapear dados
            const mappedLead = {
              id: Number(leadData.ID),
              name: leadData.NAME || leadData.TITLE || 'Nome não disponível',
              celular: leadData.PHONE?.[0]?.VALUE || null,
              address: leadData.ADDRESS || null,
              local_abordagem: leadData.ADDRESS_CITY || null,
              responsible: leadData.ASSIGNED_BY_NAME || null,
              fonte: fonteValue,
              scouter: finalScouterName,
              telemarketing: telemarketingName,
              bitrix_telemarketing_id: telemarketingId,
              commercial_project_id: commercialProjectId,
              valor_ficha: convertBitrixMoney(leadData.UF_CRM_VALORFICHA),
              criado: parsedCriado,
              sync_source: 'sync_missing',
              last_sync_at: new Date().toISOString(),
              raw: leadData
            };

            // UPSERT no Supabase
            const { error: insertError } = await supabase
              .from('leads')
              .upsert(mappedLead, { onConflict: 'id' });

            if (insertError) {
              console.error(`❌ Erro ao inserir lead ${leadId}:`, insertError);
              errors++;
              errorDetails.push({ leadId, error: insertError.message });
            } else {
              synced++;
              console.log(`✅ Lead ${leadId} importado (${resolvedScouterName})`);
            }
          } catch (leadError: any) {
            console.error(`❌ Erro ao processar lead ${leadId}:`, leadError);
            errors++;
            errorDetails.push({ leadId, error: leadError.message });
          }
        }

        // Atualizar contadores a cada batch
        if (jobId) {
          await updateHeartbeat(supabase, jobId, {
            synced_count: synced,
            error_count: errors
          });
        }

        // Pausa entre batches
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (batchError: any) {
        console.error('❌ Erro no batch:', batchError);
        errors += batch.length;
        
        if (jobId) {
          await updateHeartbeat(supabase, jobId, {
            synced_count: synced,
            error_count: errors
          });
        }
      }
    }

    // Atualizar job como completo
    if (jobId) {
      await supabase.from('missing_leads_sync_jobs').update({
        status: errors === 0 ? 'completed' : (synced > 0 ? 'completed' : 'failed'),
        stage: 'completed',
        bitrix_total: allBitrixIds.length,
        db_total: existingIds.size,
        missing_count: missingIds.length,
        synced_count: synced,
        error_count: errors,
        error_details: errorDetails.slice(0, 50),
        completed_at: new Date().toISOString()
      }).eq('id', jobId);
    }

    // Registrar evento de sync
    await supabase.from('sync_events').insert({
      event_type: 'sync_missing_leads',
      direction: 'bitrix_to_supabase',
      status: errors === 0 ? 'success' : 'partial_success',
      fields_synced_count: synced,
      error_message: errors > 0 ? `${errors} leads com erro` : null
    });

    console.log(`
      ╔════════════════════════════════════════════════════════════════
      ║ ✅ SINCRONIZAÇÃO DE LEADS FALTANTES CONCLUÍDA
      ╠════════════════════════════════════════════════════════════════
      ║ Job ID: ${jobId}
      ║ Filtro: ${scouterLabel}
      ║ Total no Bitrix: ${allBitrixIds.length}
      ║ Já existentes: ${existingIds.size}
      ║ Faltantes encontrados: ${missingIds.length}
      ║ Sincronizados com sucesso: ${synced}
      ║ Erros: ${errors}
      ╚════════════════════════════════════════════════════════════════
    `);

    return new Response(
      JSON.stringify({ 
        success: true,
        jobId,
        bitrixTotal: allBitrixIds.length,
        dbTotal: existingIds.size,
        missing: missingIds.length,
        synced, 
        errors,
        errorDetails: errorDetails.slice(0, 10)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

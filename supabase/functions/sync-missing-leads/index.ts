// Edge Function para sincronizar leads que estão no Bitrix mas não no banco
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BITRIX_BASE_URL = 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr';

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
  // Ajustar para UTC-3 (Brasil)
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Variável para armazenar o ID do job
  let jobId: string | null = null;

  try {
    let { scouterName, dateFrom, dateTo, batchSize = 10 } = await req.json();

    // FRONT A: Se não informar datas E não informar scouter, default para "hoje"
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
        scouter_name: scouterName?.trim() || null,
        date_from: dateFrom || null,
        date_to: dateTo || null,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError) {
      console.error('❌ Erro ao criar job:', jobError);
      // Continua mesmo se não conseguir criar o job (backward compatibility)
    } else {
      jobId = job.id;
      console.log(`📝 Job criado: ${jobId}`);
    }

    // scouterName é opcional agora - se não informado, busca todos
    let scouterBitrixId: number | null = null;
    let scouterLabel = 'TODOS';

    if (scouterName && scouterName.trim()) {
      console.log(`🔍 Buscando leads faltantes para scouter: ${scouterName}`);

      // Buscar o ID do scouter no Bitrix
      const { data: spaData } = await supabase
        .from('bitrix_spa_entities')
        .select('bitrix_item_id')
        .eq('entity_type_id', 1096) // Scouters entity type (correto)
        .ilike('title', `%${scouterName.trim()}%`)
        .maybeSingle();

      if (!spaData) {
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
      // Construir URL no formato correto para API Bitrix (igual ao bitrix-import-batch)
      let url = `${BITRIX_BASE_URL}/crm.lead.list.json?select[]=ID&order[ID]=DESC&start=${start}`;

      // Adicionar filtros dinamicamente
      if (scouterBitrixId) {
        url += `&filter[PARENT_ID_1096]=${scouterBitrixId}`;
      }
      if (dateFrom) {
        url += `&filter[>=DATE_CREATE]=${encodeURIComponent(dateFrom + ' 00:00:00')}`;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setDate(toDate.getDate() + 1);
        url += `&filter[<DATE_CREATE]=${encodeURIComponent(toDate.toISOString().split('T')[0] + ' 00:00:00')}`;
      }

      console.log(`🔗 URL Bitrix: ${url.substring(0, 100)}...`);
      const response = await fetch(url);
      const result = await response.json();

      if (result.error) {
        console.error('❌ Erro na API do Bitrix:', result.error);
        throw new Error(`Erro Bitrix: ${result.error_description || result.error}`);
      }

      const leads = result.result || [];
      for (const lead of leads) {
        allBitrixIds.push(Number(lead.ID));
      }

      // Verificar se há mais páginas
      if (result.next) {
        start = result.next;
      } else {
        hasMore = false;
      }

      // FRONT A: Se tiver filtro de data, aumentar limite significativamente
      // Se não tiver data (não deveria acontecer mais), manter limite conservador
      const hasDateFilter = dateFrom || dateTo;
      const maxLimit = hasDateFilter ? 50000 : (scouterBitrixId ? 2000 : 5000);
      if (allBitrixIds.length > maxLimit) {
        console.log(`⚠️ Limite de ${maxLimit} leads atingido`);
        hasMore = false;
      }
    }

    console.log(`📋 Total de leads no Bitrix para ${scouterLabel}: ${allBitrixIds.length}`);

    if (allBitrixIds.length === 0) {
      // Atualizar job como completo (sem leads para processar)
      if (jobId) {
        await supabase.from('missing_leads_sync_jobs').update({
          status: 'completed',
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

    // 3. Verificar quais IDs já existem no banco (paginado para evitar limite de 1000)
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

    if (missingIds.length === 0) {
      // Atualizar job como completo
      if (jobId) {
        await supabase.from('missing_leads_sync_jobs').update({
          status: 'completed',
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

    // 4. Buscar e importar os leads faltantes em batches
    const batches: number[][] = [];
    for (let i = 0; i < missingIds.length; i += batchSize) {
      batches.push(missingIds.slice(i, i + batchSize));
    }

    let synced = 0;
    let errors = 0;
    const errorDetails: any[] = [];

    for (const batch of batches) {
      console.log(`📦 Processando batch de ${batch.length} leads faltantes...`);

      // Buscar leads do Bitrix em batch
      const batchCommands: Record<string, string> = {};
      batch.forEach((id, idx) => {
        batchCommands[`get_${idx}`] = `crm.lead.get?ID=${id}`;
      });

      try {
        const bitrixResponse = await fetch(`${BITRIX_BASE_URL}/batch`, {
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
            // Resolver SPAs
            const scouterId = leadData.PARENT_ID_1096 ? Number(leadData.PARENT_ID_1096) : null;
            const telemarketingId = leadData.PARENT_ID_1144 ? Number(leadData.PARENT_ID_1144) : null;
            const projetoId = leadData.PARENT_ID_1154 ? Number(leadData.PARENT_ID_1154) : null;

            const [resolvedScouterName, telemarketingName, projetoName] = await Promise.all([
              resolveSpaEntityName(supabase, 1096, scouterId),
              resolveSpaEntityName(supabase, 1144, telemarketingId),
              resolveSpaEntityName(supabase, 1154, projetoId)
            ]);

            // FRONT D: Fallback para scouter quando ID existe mas nome não foi resolvido
            let finalScouterName = resolvedScouterName;
            if (!resolvedScouterName && scouterId) {
              finalScouterName = `Scouter ID ${scouterId}`;
              console.log(`⚠️ Scouter ${scouterId} não encontrado no cache, usando fallback`);
            }

            // Resolver projeto comercial
            let commercialProjectId: string | null = null;
            if (projetoName) {
              const { data: project } = await supabase
                .from('commercial_projects')
                .select('id')
                .ilike('name', `%${projetoName}%`)
                .maybeSingle();
              commercialProjectId = project?.id || null;
            }

            // FRONT B: Mapear fonte corretamente - priorizar SOURCE_DESCRIPTION, depois SOURCE_ID
            const fonteValue = leadData.SOURCE_DESCRIPTION 
              ? leadData.SOURCE_DESCRIPTION 
              : mapSourceId(leadData.SOURCE_ID);

            // FRONT C: Parsear data sem fallback perigoso
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
              criado: parsedCriado, // FRONT C: Sem fallback perigoso - null é aceito
              sync_source: 'sync_missing',
              last_sync_at: new Date().toISOString(),
              raw: leadData
            };

            // UPSERT no Supabase (atualiza se existir, insere se não)
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

        // Pausa entre batches
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (batchError: any) {
        console.error('❌ Erro no batch:', batchError);
        errors += batch.length;
      }
    }

    // Atualizar job como completo
    if (jobId) {
      await supabase.from('missing_leads_sync_jobs').update({
        status: errors === 0 ? 'completed' : (synced > 0 ? 'completed' : 'failed'),
        bitrix_total: allBitrixIds.length,
        db_total: existingIds.size,
        missing_count: missingIds.length,
        synced_count: synced,
        error_count: errors,
        error_details: errorDetails.slice(0, 50), // Limitar a 50 erros no banco
        completed_at: new Date().toISOString()
      }).eq('id', jobId);
    }

    // Registrar evento de sync (manter para retrocompatibilidade)
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

    // Atualizar job como falho
    if (jobId) {
      await supabase.from('missing_leads_sync_jobs').update({
        status: 'failed',
        error_details: [{ error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date().toISOString() }],
        completed_at: new Date().toISOString()
      }).eq('id', jobId);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', jobId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

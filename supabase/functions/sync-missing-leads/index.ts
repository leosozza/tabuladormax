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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { scouterName, dateFrom, dateTo, batchSize = 10 } = await req.json();

    if (!scouterName) {
      return new Response(
        JSON.stringify({ error: 'scouterName é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Buscando leads faltantes para scouter: ${scouterName}`);

    // 1. Buscar o ID do scouter no Bitrix
    const { data: spaData } = await supabase
      .from('bitrix_spa_entities')
      .select('bitrix_item_id')
      .eq('entity_type_id', 1140) // Scouters entity type
      .ilike('title', `%${scouterName}%`)
      .maybeSingle();

    if (!spaData) {
      return new Response(
        JSON.stringify({ error: `Scouter "${scouterName}" não encontrado no sistema` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scouterBitrixId = spaData.bitrix_item_id;
    console.log(`📌 Scouter ID no Bitrix: ${scouterBitrixId}`);

    // 2. Buscar leads do Bitrix com filtro por scouter e data
    const filter: Record<string, any> = {
      'PARENT_ID_1140': scouterBitrixId // Filtrar por scouter
    };

    // Filtrar por data se fornecido
    if (dateFrom) {
      filter['>=DATE_CREATE'] = dateFrom;
    }
    if (dateTo) {
      // Adicionar 1 dia ao dateTo para incluir o dia inteiro
      const toDate = new Date(dateTo);
      toDate.setDate(toDate.getDate() + 1);
      filter['<DATE_CREATE'] = toDate.toISOString().split('T')[0];
    }

    // Buscar todos os IDs do Bitrix
    const allBitrixIds: number[] = [];
    let start = 0;
    const bitrixLimit = 50;
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams({
        select: JSON.stringify(['ID']),
        filter: JSON.stringify(filter),
        order: JSON.stringify({ ID: 'DESC' }),
        start: String(start)
      });

      const response = await fetch(`${BITRIX_BASE_URL}/crm.lead.list?${params}`);
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

      // Limite de segurança
      if (allBitrixIds.length > 1000) {
        console.log('⚠️ Limite de 1000 leads atingido');
        hasMore = false;
      }
    }

    console.log(`📋 Total de leads no Bitrix para ${scouterName}: ${allBitrixIds.length}`);

    if (allBitrixIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhum lead encontrado no Bitrix com os filtros especificados',
          bitrixTotal: 0,
          dbTotal: 0,
          missing: 0,
          synced: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Verificar quais IDs já existem no banco
    const { data: existingLeads } = await supabase
      .from('leads')
      .select('id')
      .in('id', allBitrixIds);

    const existingIds = new Set((existingLeads || []).map(l => l.id));
    const missingIds = allBitrixIds.filter(id => !existingIds.has(id));

    console.log(`📊 Leads no banco: ${existingIds.size} | Faltantes: ${missingIds.length}`);

    if (missingIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
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
            const scouterId = leadData.PARENT_ID_1140 ? Number(leadData.PARENT_ID_1140) : null;
            const telemarketingId = leadData.PARENT_ID_1144 ? Number(leadData.PARENT_ID_1144) : null;
            const projetoId = leadData.PARENT_ID_1154 ? Number(leadData.PARENT_ID_1154) : null;

            const [resolvedScouterName, telemarketingName, projetoName] = await Promise.all([
              resolveSpaEntityName(supabase, 1140, scouterId),
              resolveSpaEntityName(supabase, 1144, telemarketingId),
              resolveSpaEntityName(supabase, 1154, projetoId)
            ]);

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

            // Mapear dados
            const mappedLead = {
              id: Number(leadData.ID),
              name: leadData.NAME || leadData.TITLE || 'Nome não disponível',
              celular: leadData.PHONE?.[0]?.VALUE || null,
              address: leadData.ADDRESS || null,
              local_abordagem: leadData.ADDRESS_CITY || null,
              responsible: leadData.ASSIGNED_BY_NAME || null,
              fonte: leadData.SOURCE_DESCRIPTION || null,
              scouter: resolvedScouterName,
              telemarketing: telemarketingName,
              bitrix_telemarketing_id: telemarketingId,
              commercial_project_id: commercialProjectId,
              valor_ficha: convertBitrixMoney(leadData.UF_CRM_VALORFICHA),
              criado: parseBrazilianDate(leadData.DATE_CREATE) || new Date().toISOString(),
              sync_source: 'sync_missing',
              last_sync_at: new Date().toISOString(),
              raw: leadData
            };

            // Inserir no Supabase
            const { error: insertError } = await supabase
              .from('leads')
              .insert(mappedLead);

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
      ║ Scouter: ${scouterName}
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

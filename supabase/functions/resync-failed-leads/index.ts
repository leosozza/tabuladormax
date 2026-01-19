// Edge Function para resincronizar leads que falharam por timeout
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

    const { leadIds, hoursBack = 24, batchSize = 10 } = await req.json();

    let failedLeadIds: number[] = [];

    if (leadIds && Array.isArray(leadIds)) {
      // Usar IDs fornecidos diretamente
      failedLeadIds = leadIds;
    } else {
      // Buscar leads que falharam por timeout nas últimas X horas
      const { data: failedEvents } = await supabase
        .from('sync_events')
        .select('lead_id')
        .eq('status', 'error')
        .ilike('error_message', '%timeout%')
        .gte('created_at', new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString());

      if (!failedEvents || failedEvents.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'Nenhum lead com erro de timeout encontrado', synced: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Pegar IDs únicos
      const uniqueIds = [...new Set(failedEvents.map(e => e.lead_id).filter(Boolean))];

      // Verificar quais ainda não existem no banco
      const { data: existingLeads } = await supabase
        .from('leads')
        .select('id')
        .in('id', uniqueIds);

      const existingIds = new Set((existingLeads || []).map(l => l.id));
      failedLeadIds = uniqueIds.filter(id => !existingIds.has(id));
    }

    console.log(`📋 Total de leads para resincronizar: ${failedLeadIds.length}`);

    if (failedLeadIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Todos os leads já estão sincronizados', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Processar em batches pequenos
    const batches: number[][] = [];
    for (let i = 0; i < failedLeadIds.length; i += batchSize) {
      batches.push(failedLeadIds.slice(i, i + batchSize));
    }

    let synced = 0;
    let errors = 0;
    const errorDetails: any[] = [];

    for (const batch of batches) {
      console.log(`📦 Processando batch de ${batch.length} leads...`);

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

        // Processar cada lead individualmente
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

            const [scouterName, telemarketingName, projetoName] = await Promise.all([
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

            // Mapear dados - usando APENAS colunas que existem na tabela leads
            // Colunas válidas: address, age, celular, commercial_project_id, criado, fonte, 
            // id, local_abordagem, name, raw, responsible, scouter, sync_source, 
            // telemarketing, bitrix_telemarketing_id, valor_ficha, last_sync_at
            const mappedLead = {
              id: Number(leadData.ID),
              name: leadData.NAME || leadData.TITLE || 'Nome não disponível',
              celular: leadData.PHONE?.[0]?.VALUE || null,
              address: leadData.ADDRESS || null,
              local_abordagem: leadData.ADDRESS_CITY || null,
              responsible: leadData.ASSIGNED_BY_NAME || null,
              fonte: leadData.SOURCE_DESCRIPTION || null,
              scouter: scouterName,
              telemarketing: telemarketingName,
              bitrix_telemarketing_id: telemarketingId,
              commercial_project_id: commercialProjectId,
              valor_ficha: convertBitrixMoney(leadData.UF_CRM_VALORFICHA),
              criado: parseBrazilianDate(leadData.DATE_CREATE) || new Date().toISOString(),
              sync_source: 'resync_failed',
              last_sync_at: new Date().toISOString(),
              raw: leadData
            };

            // Salvar no Supabase (com insert simples, não upsert)
            const { error: insertError } = await supabase
              .from('leads')
              .insert(mappedLead);

            if (insertError) {
              // Se já existe, tentar update
              if (insertError.code === '23505') {
                const { error: updateError } = await supabase
                  .from('leads')
                  .update({
                    ...mappedLead,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', leadId);

                if (updateError) {
                  console.error(`❌ Erro ao atualizar lead ${leadId}:`, updateError);
                  errors++;
                  errorDetails.push({ leadId, error: updateError.message });
                } else {
                  synced++;
                  console.log(`✅ Lead ${leadId} atualizado`);
                }
              } else {
                console.error(`❌ Erro ao inserir lead ${leadId}:`, insertError);
                errors++;
                errorDetails.push({ leadId, error: insertError.message });
              }
            } else {
              synced++;
              console.log(`✅ Lead ${leadId} sincronizado`);
            }
          } catch (leadError: any) {
            console.error(`❌ Erro ao processar lead ${leadId}:`, leadError);
            errors++;
            errorDetails.push({ leadId, error: leadError.message });
          }
        }

        // Pequena pausa entre batches para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (batchError: any) {
        console.error('❌ Erro no batch:', batchError);
        errors += batch.length;
      }
    }

    // Registrar evento de resync
    await supabase.from('sync_events').insert({
      event_type: 'resync_failed_leads',
      direction: 'bitrix_to_supabase',
      status: errors === 0 ? 'success' : 'partial_success',
      fields_synced_count: synced,
      error_message: errors > 0 ? `${errors} leads com erro` : null
    });

    console.log(`
      ╔════════════════════════════════════════════════════════════════
      ║ ✅ RESINCRONIZAÇÃO CONCLUÍDA
      ╠════════════════════════════════════════════════════════════════
      ║ Sincronizados: ${synced}
      ║ Erros: ${errors}
      ║ Total processados: ${failedLeadIds.length}
      ╚════════════════════════════════════════════════════════════════
    `);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced, 
        errors, 
        total: failedLeadIds.length,
        errorDetails: errorDetails.slice(0, 10) // Limitar detalhes de erro
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

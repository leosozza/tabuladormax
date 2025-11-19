import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { corsHeaders } from '../_shared/cors.ts';

interface ReprocessStats {
  totalLeads: number;
  processedLeads: number;
  updatedLeads: number;
  skippedLeads: number;
  errorLeads: number;
  fieldsUpdated: { [key: string]: number };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, batchSize = 50, filters } = await req.json();

    if (action === 'start') {
      return await startReprocessing(supabase, batchSize, filters);
    } else if (action === 'stats') {
      return await getReprocessStats(supabase);
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getReprocessStats(supabase: any) {
  console.log('📊 Coletando estatísticas de leads...');

  // Contar leads com raw mas com campos importantes NULL
  const { data: leadsWithProblem, error: countError } = await supabase
    .from('leads')
    .select('id, scouter, fonte, etapa, commercial_project_id, raw')
    .not('raw', 'is', null);

  if (countError) {
    throw new Error(`Erro ao contar leads: ${countError.message}`);
  }

  const stats = {
    totalLeadsWithRaw: leadsWithProblem?.length || 0,
    leadsWithNullScouter: leadsWithProblem?.filter((l: any) => !l.scouter).length || 0,
    leadsWithNullFonte: leadsWithProblem?.filter((l: any) => !l.fonte).length || 0,
    leadsWithNullEtapa: leadsWithProblem?.filter((l: any) => !l.etapa).length || 0,
    leadsWithNullProject: leadsWithProblem?.filter((l: any) => !l.commercial_project_id).length || 0,
    leadsNeedingUpdate: leadsWithProblem?.filter((l: any) => 
      !l.scouter || !l.fonte || !l.etapa || !l.commercial_project_id
    ).length || 0
  };

  console.log('✅ Estatísticas coletadas:', stats);

  return new Response(
    JSON.stringify(stats),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function startReprocessing(supabase: any, batchSize: number, filters: any) {
  console.log('🚀 Iniciando re-processamento de leads...');
  console.log('📦 Tamanho do lote:', batchSize);
  console.log('🔍 Filtros:', filters);

  const stats: ReprocessStats = {
    totalLeads: 0,
    processedLeads: 0,
    updatedLeads: 0,
    skippedLeads: 0,
    errorLeads: 0,
    fieldsUpdated: {}
  };

  // 1. Buscar mapeamentos ativos
  console.log('📋 Buscando mapeamentos ativos...');
  const { data: mappings, error: mappingsError } = await supabase
    .from('bitrix_field_mappings')
    .select('*')
    .eq('active', true)
    .order('priority', { ascending: false });

  if (mappingsError) {
    throw new Error(`Erro ao buscar mapeamentos: ${mappingsError.message}`);
  }

  console.log(`✅ ${mappings.length} mapeamentos ativos encontrados`);

  // 2. Buscar projetos comerciais para lookup
  const { data: projects, error: projectsError } = await supabase
    .from('commercial_projects')
    .select('id, code, name');

  if (projectsError) {
    console.warn('⚠️ Erro ao buscar projetos:', projectsError);
  }

  const projectsByCode = new Map(projects?.map((p: any) => [p.code, p]) || []);
  console.log(`✅ ${projectsByCode.size} projetos carregados`);

  // 3. Buscar leads com raw preenchido
  let query = supabase
    .from('leads')
    .select('id, raw')
    .not('raw', 'is', null);

  // Aplicar filtros opcionais
  if (filters?.onlyMissingFields) {
    query = query.or('scouter.is.null,fonte.is.null,etapa.is.null,commercial_project_id.is.null');
  }

  if (filters?.dateFrom) {
    query = query.gte('criado', filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte('criado', filters.dateTo);
  }

  const { data: leads, error: leadsError } = await query;

  if (leadsError) {
    throw new Error(`Erro ao buscar leads: ${leadsError.message}`);
  }

  stats.totalLeads = leads?.length || 0;
  console.log(`✅ ${stats.totalLeads} leads para processar`);

  // 4. Processar leads em lotes
  const batches = [];
  for (let i = 0; i < leads.length; i += batchSize) {
    batches.push(leads.slice(i, i + batchSize));
  }

  console.log(`📦 Processando em ${batches.length} lotes de até ${batchSize} leads`);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`\n📦 Lote ${batchIndex + 1}/${batches.length} - ${batch.length} leads`);

    for (const lead of batch) {
      try {
        const updates: any = {};
        let hasUpdates = false;

        // Processar cada mapeamento
        for (const mapping of mappings) {
          const bitrixValue = lead.raw[mapping.bitrix_field];

          // Pular se não há valor no raw
          if (bitrixValue === null || bitrixValue === undefined || bitrixValue === '') {
            continue;
          }

          // Transformações especiais
          if (mapping.tabuladormax_field === 'commercial_project_id') {
            // Buscar projeto pelo código
            const projectCode = lead.raw['UF_CRM_1741215746'] || lead.raw['PARENT_ID_1120'];
            if (projectCode) {
              const project: any = projectsByCode.get(String(projectCode));
              if (project) {
                updates.commercial_project_id = project.id;
                hasUpdates = true;
                stats.fieldsUpdated['commercial_project_id'] = (stats.fieldsUpdated['commercial_project_id'] || 0) + 1;
              }
            }
          }
          else if (mapping.tabuladormax_field === 'scouter') {
            // Extrair nome do scouter do campo TITLE
            const title = lead.raw['TITLE'];
            if (title && typeof title === 'string' && title.includes('SCOUTER-')) {
              const scouterName = title.split('SCOUTER-')[1]?.trim();
              if (scouterName) {
                updates.scouter = scouterName;
                hasUpdates = true;
                stats.fieldsUpdated['scouter'] = (stats.fieldsUpdated['scouter'] || 0) + 1;
              }
            }
          }
          else if (mapping.tabuladormax_field === 'nome_modelo') {
            // Extrair primeiro elemento do array e fazer trim
            if (Array.isArray(bitrixValue) && bitrixValue.length > 0) {
              const nomeModelo = String(bitrixValue[0]).trim();
              if (nomeModelo) {
                updates.nome_modelo = nomeModelo;
                hasUpdates = true;
                stats.fieldsUpdated['nome_modelo'] = (stats.fieldsUpdated['nome_modelo'] || 0) + 1;
              }
            }
          }
          else if (mapping.tabuladormax_field === 'valor_ficha') {
            // Extrair valor de "6|BRL" -> 6
            if (typeof bitrixValue === 'string') {
              const match = bitrixValue.match(/^(\d+(?:\.\d+)?)/);
              if (match) {
                updates.valor_ficha = parseFloat(match[1]);
                hasUpdates = true;
                stats.fieldsUpdated['valor_ficha'] = (stats.fieldsUpdated['valor_ficha'] || 0) + 1;
              }
            }
          }
          else if (mapping.tabuladormax_field === 'telefone_casa') {
            // Extrair do array de telefones
            const phones = lead.raw['PHONE'];
            if (Array.isArray(phones) && phones.length > 0) {
              updates.telefone_casa = phones[0]?.VALUE || null;
              hasUpdates = true;
              stats.fieldsUpdated['telefone_casa'] = (stats.fieldsUpdated['telefone_casa'] || 0) + 1;
            }
          }
          else if (mapping.tabuladormax_field === 'celular') {
            // Extrair do array de telefones (segundo número se existir)
            const phones = lead.raw['PHONE'];
            if (Array.isArray(phones) && phones.length > 1) {
              updates.celular = phones[1]?.VALUE || null;
              hasUpdates = true;
              stats.fieldsUpdated['celular'] = (stats.fieldsUpdated['celular'] || 0) + 1;
            } else if (Array.isArray(phones) && phones.length === 1) {
              updates.celular = phones[0]?.VALUE || null;
              hasUpdates = true;
              stats.fieldsUpdated['celular'] = (stats.fieldsUpdated['celular'] || 0) + 1;
            }
          }
          else if (mapping.tabuladormax_field === 'criado') {
            // Parsear data de criação
            if (bitrixValue) {
              updates.criado = new Date(bitrixValue).toISOString();
              hasUpdates = true;
              stats.fieldsUpdated['criado'] = (stats.fieldsUpdated['criado'] || 0) + 1;
            }
          }
          else if (mapping.tabuladormax_field === 'date_modify') {
            // Parsear data de modificação
            if (bitrixValue) {
              updates.date_modify = new Date(bitrixValue).toISOString();
              hasUpdates = true;
              stats.fieldsUpdated['date_modify'] = (stats.fieldsUpdated['date_modify'] || 0) + 1;
            }
          }
          else {
            // Mapeamento direto para outros campos
            updates[mapping.tabuladormax_field] = bitrixValue;
            hasUpdates = true;
            stats.fieldsUpdated[mapping.tabuladormax_field] = (stats.fieldsUpdated[mapping.tabuladormax_field] || 0) + 1;
          }
        }

        // Atualizar lead se houver mudanças
        if (hasUpdates) {
          const { error: updateError } = await supabase
            .from('leads')
            .update(updates)
            .eq('id', lead.id);

          if (updateError) {
            console.error(`❌ Erro ao atualizar lead ${lead.id}:`, updateError);
            stats.errorLeads++;
          } else {
            stats.updatedLeads++;
          }
        } else {
          stats.skippedLeads++;
        }

        stats.processedLeads++;

        // Log de progresso a cada 50 leads
        if (stats.processedLeads % 50 === 0) {
          console.log(`📊 Progresso: ${stats.processedLeads}/${stats.totalLeads} (${Math.round(stats.processedLeads / stats.totalLeads * 100)}%)`);
        }
      } catch (error) {
        console.error(`❌ Erro ao processar lead ${lead.id}:`, error);
        stats.errorLeads++;
        stats.processedLeads++;
      }
    }
  }

  console.log('\n✅ Re-processamento concluído!');
  console.log('📊 Estatísticas finais:', stats);

  return new Response(
    JSON.stringify(stats),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

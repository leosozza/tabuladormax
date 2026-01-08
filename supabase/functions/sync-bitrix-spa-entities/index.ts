import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse do body para verificar filtros
    let filterEntityTypeId: number | null = null;
    let filterItemId: number | null = null;
    
    try {
      const body = await req.json();
      filterEntityTypeId = body.entityTypeId || null;
      filterItemId = body.itemId || null;
      console.log(`🔍 Filtros recebidos: entityTypeId=${filterEntityTypeId}, itemId=${filterItemId}`);
    } catch {
      // Sem body, sincronizar tudo
    }

    console.log('🔄 Sincronizando entidades SPA do Bitrix...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const bitrixDomain = 'maxsystem.bitrix24.com.br';
    const bitrixToken = Deno.env.get('BITRIX_REST_TOKEN') || '9/85e3cex48z1zc0qp';

    // Entity types conhecidos:
    // 1096 = Scouters (apenas ativos: stageId=DT1096_210:NEW)
    // 1120 = Projetos Comerciais
    // 1144 = Telemarketing
    // 1156 = Produtores
    const allEntityTypes = [
      { id: 1096, name: 'Scouters' },
      { id: 1120, name: 'Projetos Comerciais' },
      { id: 1144, name: 'Telemarketing' },
      { id: 1156, name: 'Produtores' }
    ];

    // Filtrar por entityTypeId se especificado
    const entityTypes = filterEntityTypeId 
      ? allEntityTypes.filter(t => t.id === filterEntityTypeId)
      : allEntityTypes;

    console.log(`📋 Sincronizando ${entityTypes.length} tipo(s) de entidade`);

    let totalSynced = 0;
    const errors: string[] = [];

    for (const entityType of entityTypes) {
      try {
        console.log(`📥 Buscando ${entityType.name} (entityTypeId: ${entityType.id})...`);

        let allItems: any[] = [];
        let start = 0;
        const limit = 50;
        let hasMore = true;

        // Implementar paginação para buscar todos os registros
        while (hasMore) {
        // Filtros específicos por tipo de entidade
          let stageFilter = '';
          let extraFields = '';
          
          if (entityType.id === 1096) {
            // Scouters: apenas ativos + campos de foto e chave de acesso
            stageFilter = '&filter[stageId]=DT1096_210:NEW';
            extraFields = '&select[]=ufCrm32_1739220520381&select[]=ufCrm32_1739219729812';
          } else if (entityType.id === 1144) {
            // Telemarketing: campos de chave de acesso, cargo, FOTO e projeto comercial (parentId1120)
            extraFields = '&select[]=ufCrm50Chavetele&select[]=ufCrm50Cargo&select[]=ufCrm50Fototele&select[]=parentId1120';
          } else if (entityType.id === 1156) {
            // Produtores: campo UF_CRM_54_CHAVE para chave de acesso
            extraFields = '&select[]=ufCrm54Chave';
          }
          
          const url = `https://${bitrixDomain}/rest/${bitrixToken}/crm.item.list.json?entityTypeId=${entityType.id}${stageFilter}&select[]=id&select[]=title&select[]=stageId&select[]=categoryId${extraFields}&start=${start}`;
          
          console.log(`  📄 Buscando página ${Math.floor(start / limit) + 1} (offset: ${start})...`);
          
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status} ao buscar ${entityType.name}`);
          }

          const data = await response.json();
          
          if (!data.result || !data.result.items) {
            break;
          }

          const items = data.result.items;
          allItems = allItems.concat(items);
          
          // Verificar se há mais páginas
          hasMore = items.length === limit && data.next !== undefined;
          start += limit;
          
          console.log(`  ✅ ${items.length} itens nesta página (total: ${allItems.length})`);
          
          if (items.length < limit) {
            hasMore = false;
          }
        }

        console.log(`✅ Total de ${allItems.length} ${entityType.name} encontrados`);

        // Upsert em lote
        for (const item of allItems) {
          let photoUrl: string | null = null;
          
          // Processar foto para Scouters usando urlMachine
          if (entityType.id === 1096 && item.ufCrm32_1739220520381?.urlMachine) {
            try {
              const photoData = item.ufCrm32_1739220520381;
              console.log(`📸 Processando foto para Scouter ${item.id} (${item.title})`);
              
              // Usar urlMachine diretamente (já vem autenticada)
              const fileUrl = photoData.urlMachine;
              console.log(`  ⬇️ Baixando foto via urlMachine`);
              
              const imageResp = await fetch(fileUrl);
              if (!imageResp.ok) {
                console.error(
                  `  ❌ Erro HTTP ${imageResp.status} ao baixar foto do Scouter ${item.id}`,
                );
              } else {
                const imageBlob = await imageResp.blob();
                console.log(`  📦 Foto baixada: ${imageBlob.size} bytes`);
                
                // Fazer upload para Supabase Storage
                const fileName = `scouter-${item.id}-${Date.now()}.jpg`;
                const { error: uploadError } = await supabase.storage
                  .from('scouter-photos')
                  .upload(fileName, imageBlob, {
                    contentType: 'image/jpeg',
                    upsert: true,
                  });
                
                if (uploadError) {
                  console.error(
                    `  ❌ Erro ao fazer upload da foto: ${uploadError.message}`,
                  );
                } else {
                  // Obter URL pública
                  const {
                    data: { publicUrl },
                  } = supabase.storage.from('scouter-photos').getPublicUrl(fileName);
                  
                  photoUrl = publicUrl;
                  console.log(`  ✅ Foto salva: ${photoUrl}`);
                }
              }
            } catch (photoError) {
              console.error(`  ❌ Erro ao processar foto do Scouter ${item.id}:`, photoError);
            }
          }
          
          // UPSERT para Scouters - cria novos ou atualiza existentes automaticamente
          if (entityType.id === 1096) {
            const accessKey = item.ufCrm32_1739219729812 
              ? String(item.ufCrm32_1739219729812) 
              : null;
            
            console.log(`👤 Sincronizando Scouter ${item.id} (${item.title}) - chave: ${accessKey || 'sem chave'}`);
            
            // Preparar dados para upsert
            const scouterData: Record<string, unknown> = {
              bitrix_id: item.id,
              name: (item.title || `Scouter ${item.id}`).trim(),
              status: 'ativo',
              updated_at: new Date().toISOString(),
            };
            
            // Adicionar access_key se existir
            if (accessKey) {
              scouterData.access_key = accessKey;
            }
            
            // Adicionar photo_url se existir
            if (photoUrl) {
              scouterData.photo_url = photoUrl;
            }
            
            const { error: scouterError } = await supabase
              .from('scouters')
              .upsert(scouterData, {
                onConflict: 'bitrix_id'
              });
            
            if (scouterError) {
              console.error(`  ⚠️ Erro ao upsert scouter ${item.id}: ${scouterError.message}`);
            } else {
              console.log(`  ✅ Scouter ${item.title} sincronizado com sucesso`);
            }
          }
          
          // Processar foto para Telemarketing usando urlMachine
          if (entityType.id === 1144) {
            // Tentar múltiplas variações do nome do campo de foto
            const photoData = 
              item.ufCrm50Fototele || 
              item.ufCrm50_Fototele ||
              item['UF_CRM_50_FOTOTELE'] ||
              item.ufCrm_50_Fototele ||
              null;
            
            if (photoData?.urlMachine) {
              try {
                console.log(`📸 Processando foto para Telemarketing ${item.id} (${item.title})`);
                
                const fileUrl = photoData.urlMachine;
                console.log(`  ⬇️ Baixando foto via urlMachine`);
                
                const imageResp = await fetch(fileUrl);
                if (!imageResp.ok) {
                  console.error(
                    `  ❌ Erro HTTP ${imageResp.status} ao baixar foto do Telemarketing ${item.id}`,
                  );
                } else {
                  const imageBlob = await imageResp.blob();
                  console.log(`  📦 Foto baixada: ${imageBlob.size} bytes`);
                  
                  // Fazer upload para Supabase Storage
                  const fileName = `telemarketing-${item.id}-${Date.now()}.jpg`;
                  const { error: uploadError } = await supabase.storage
                    .from('telemarketing-photos')
                    .upload(fileName, imageBlob, {
                      contentType: 'image/jpeg',
                      upsert: true,
                    });
                  
                  if (uploadError) {
                    console.error(
                      `  ❌ Erro ao fazer upload da foto: ${uploadError.message}`,
                    );
                  } else {
                    // Obter URL pública
                    const {
                      data: { publicUrl },
                    } = supabase.storage.from('telemarketing-photos').getPublicUrl(fileName);
                    
                    photoUrl = publicUrl;
                    console.log(`  ✅ Foto telemarketing salva: ${photoUrl}`);
                  }
                }
              } catch (photoError) {
                console.error(`  ❌ Erro ao processar foto do Telemarketing ${item.id}:`, photoError);
              }
            }
          }
          
          // Processar Telemarketing - criar/atualizar na tabela telemarketing_operators
          if (entityType.id === 1144) {
            console.log(`📞 Telemarketing ${item.id} (${item.title}) - Keys:`, Object.keys(item));
            
            // Tentar múltiplas variações do nome dos campos
            const accessKey = 
              item.ufCrm50Chavetele || 
              item.ufCrm50_Chavetele ||
              item['UF_CRM_50_CHAVETELE'] ||
              item.ufCrm_50_Chavetele ||
              null;
            
            const cargo = 
              item.ufCrm50Cargo || 
              item.ufCrm50_Cargo ||
              item['UF_CRM_50_CARGO'] ||
              item.ufCrm_50_Cargo ||
              'agente';
            
            // Buscar projeto comercial vinculado (parentId1120)
            const projectBitrixId = item.parentId1120 || null;
            let commercialProjectId: string | null = null;
            
            if (projectBitrixId) {
              console.log(`  🏢 Buscando projeto comercial: parentId1120=${projectBitrixId}`);
              const { data: projectData } = await supabase
                .from('commercial_projects')
                .select('id')
                .eq('code', String(projectBitrixId))
                .maybeSingle();
              
              commercialProjectId = projectData?.id || null;
              console.log(`  🏢 Projeto comercial encontrado: ${commercialProjectId || 'NÃO ENCONTRADO'}`);
            }
            
            console.log(`  🔑 Chave: ${accessKey || 'SEM CHAVE'} | Cargo: ${cargo} | Foto: ${photoUrl ? 'SIM' : 'NÃO'} | Projeto: ${commercialProjectId || 'NENHUM'}`);
            
            const { error: teleError } = await supabase
              .from('telemarketing_operators')
              .upsert({
                bitrix_id: item.id,
                name: (item.title || `Operador ${item.id}`).trim(),
                access_key: accessKey,
                cargo: String(cargo),
                photo_url: photoUrl,
                commercial_project_id: commercialProjectId,
                status: 'ativo',
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'bitrix_id'
              });
            
            if (teleError) {
              console.error(`  ⚠️ Erro ao salvar telemarketing: ${teleError.message}`);
            } else {
              console.log(`  ✅ Telemarketing ${item.title} salvo com chave: ${accessKey}`);
            }
            
            // ========== CRIAR USUÁRIO NO TABULADORMAX AUTOMATICAMENTE ==========
            if (accessKey) {
              try {
                // Verificar se já existe usuário no TabuladorMax com esse bitrix_id
                const { data: existingMapping } = await supabase
                  .from('agent_telemarketing_mapping')
                  .select('id, tabuladormax_user_id')
                  .eq('bitrix_telemarketing_id', item.id)
                  .maybeSingle();
                
                if (!existingMapping) {
                  console.log(`  🆕 Criando usuário TabuladorMax para ${item.title}...`);
                  
                  const email = `tele-${item.id}@maxfama.com.br`;
                  const password = String(accessKey);
                  const operatorName = (item.title || `Operador ${item.id}`).trim();
                  
                  // Determinar role baseado no cargo
                  // 10620 = Supervisor, 10626 = Supervisor Adjunto, 10627 = Control Desk
                  const cargoNum = Number(cargo);
                  const isSupervisorRole = cargoNum === 10620 || cargoNum === 10626 || cargoNum === 10627;
                  const roleName = isSupervisorRole ? 'supervisor' : 'agent';
                  
                  // Criar usuário no Supabase Auth
                  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                    email,
                    password,
                    email_confirm: true,
                    user_metadata: {
                      display_name: operatorName,
                      bitrix_telemarketing_id: item.id
                    }
                  });
                  
                  if (authError) {
                    console.error(`  ❌ Erro ao criar usuário auth: ${authError.message}`);
                  } else if (authData?.user) {
                    const userId = authData.user.id;
                    console.log(`  ✅ Usuário auth criado: ${userId}`);
                    
                    // Criar profile
                    const { error: profileError } = await supabase
                      .from('profiles')
                      .upsert({
                        id: userId,
                        display_name: operatorName,
                        email: email,
                        updated_at: new Date().toISOString()
                      }, { onConflict: 'id' });
                    
                    if (profileError) {
                      console.error(`  ⚠️ Erro ao criar profile: ${profileError.message}`);
                    }
                    
                    // Criar user_role
                    const { error: roleError } = await supabase
                      .from('user_roles')
                      .insert({
                        user_id: userId,
                        role: roleName
                      });
                    
                    if (roleError && !roleError.message.includes('duplicate')) {
                      console.error(`  ⚠️ Erro ao criar role: ${roleError.message}`);
                    }
                    
                    // Buscar departamento telemarketing
                    const { data: deptData } = await supabase
                      .from('departments')
                      .select('id')
                      .eq('code', 'telemarketing')
                      .single();
                    
                    if (deptData) {
                      // Criar user_department
                      const { error: deptError } = await supabase
                        .from('user_departments')
                        .insert({
                          user_id: userId,
                          department_id: deptData.id
                        });
                      
                      if (deptError && !deptError.message.includes('duplicate')) {
                        console.error(`  ⚠️ Erro ao criar departamento: ${deptError.message}`);
                      }
                    }
                    
                    // Auto-vincular supervisor para agentes (cargo 10618)
                    let supervisorId: string | null = null;
                    
                    if (!isSupervisorRole && commercialProjectId) {
                      console.log(`  🔍 Buscando supervisor do projeto ${commercialProjectId}...`);
                      
                      // Buscar supervisor principal do projeto (cargo 10620)
                      const { data: supervisorOperators } = await supabase
                        .from('telemarketing_operators')
                        .select('bitrix_id')
                        .eq('commercial_project_id', commercialProjectId)
                        .eq('cargo', '10620');
                      
                      if (supervisorOperators && supervisorOperators.length > 0) {
                        const supervisorBitrixIds = supervisorOperators.map(s => s.bitrix_id);
                        
                        // Buscar o tabuladormax_user_id do supervisor
                        const { data: supervisorMapping } = await supabase
                          .from('agent_telemarketing_mapping')
                          .select('tabuladormax_user_id')
                          .in('bitrix_telemarketing_id', supervisorBitrixIds)
                          .limit(1)
                          .maybeSingle();
                        
                        supervisorId = supervisorMapping?.tabuladormax_user_id || null;
                        console.log(`  👤 Supervisor encontrado: ${supervisorId || 'NENHUM'}`);
                      }
                    }
                    
                    // Criar agent_telemarketing_mapping com projeto e supervisor auto-vinculados
                    const { error: mappingError } = await supabase
                      .from('agent_telemarketing_mapping')
                      .insert({
                        tabuladormax_user_id: userId,
                        bitrix_telemarketing_id: item.id,
                        bitrix_telemarketing_name: operatorName,
                        commercial_project_id: commercialProjectId,
                        supervisor_id: supervisorId
                      });
                    
                    if (mappingError) {
                      console.error(`  ⚠️ Erro ao criar mapping: ${mappingError.message}`);
                    } else {
                      console.log(`  🎉 Usuário TabuladorMax criado com sucesso!`);
                      console.log(`     📧 Email: ${email}`);
                      console.log(`     🔐 Senha: ${password}`);
                      console.log(`     👤 Role: ${roleName}`);
                      console.log(`     🏢 Projeto: ${commercialProjectId || 'NENHUM'}`);
                      console.log(`     👥 Supervisor: ${supervisorId || 'NENHUM'}`);
                    }
                  }
                } else {
                  console.log(`  ℹ️ Usuário TabuladorMax já existe para ${item.title}`);
                }
              } catch (tabuladorError) {
                console.error(`  ❌ Erro ao criar usuário TabuladorMax:`, tabuladorError);
              }
            }
            // ========== FIM CRIAÇÃO USUÁRIO TABULADORMAX ==========
          }
          
          // Processar Produtores - criar/atualizar na tabela producers
          if (entityType.id === 1156) {
            // DEBUG: Mostrar TODAS as chaves do objeto para descobrir nome correto do campo
            console.log(`👔 Produtor ${item.id} (${item.title}) - TODAS AS CHAVES DO OBJETO:`);
            console.log(`  🔍 Keys:`, Object.keys(item));
            console.log(`  📦 Dados completos:`, JSON.stringify(item, null, 2));
            
            // Tentar múltiplas variações do nome do campo UF_CRM_54_CHAVE
            const accessKey = 
              item.ufCrm54Chave || 
              item.ufCrm_54_Chave ||
              item['UF_CRM_54_CHAVE'] ||
              item.ufCrm54_Chave ||
              item['ufCrm54Chave'] ||
              item.ufCrm54chave ||
              null;
            
            console.log(`  🔑 Chave encontrada: ${accessKey ? String(accessKey) : 'NENHUMA VARIAÇÃO ENCONTRADA'}`);
            
            const { error: producerError } = await supabase
              .from('producers')
              .upsert({
                bitrix_id: item.id,
                name: (item.title || `Produtor ${item.id}`).trim(),
                access_key: accessKey,
                photo_url: photoUrl,
                status: 'ativo',
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'bitrix_id'
              });
            
            if (producerError) {
              console.error(`  ⚠️ Erro ao salvar produtor: ${producerError.message}`);
            } else {
              console.log(`  ✅ Produtor ${item.title} salvo com chave: ${accessKey}`);
            }
          }
          
          const { error: upsertError } = await supabase
            .from('bitrix_spa_entities')
            .upsert(
              {
                entity_type_id: entityType.id,
                bitrix_item_id: item.id,
                title: (item.title || `Item ${item.id}`).trim(),
                stage_id: item.stageId || null,
                photo_url: photoUrl,
                cached_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: 'entity_type_id,bitrix_item_id',
              },
            );

          if (upsertError) {
            console.error(
              `❌ Erro ao inserir ${entityType.name} ID ${item.id}:`,
              upsertError,
            );
            errors.push(
              `${entityType.name} ID ${item.id}: ${upsertError.message}`,
            );
          } else {
            totalSynced++;
          }
        }

        console.log(`✅ ${entityType.name} sincronizados com sucesso`);
      } catch (error) {
        const errorMsg = `Erro ao sincronizar ${entityType.name}: ${
          error instanceof Error ? error.message : String(error)
        }`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log(`🎉 Sincronização concluída: ${totalSynced} entidades atualizadas`);

    return new Response(
      JSON.stringify({
        success: true,
        totalSynced,
        errors: errors.length > 0 ? errors : undefined,
        message: `${totalSynced} entidades SPA sincronizadas com sucesso`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('❌ Erro na sincronização de entidades SPA:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

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
    const entityTypes = [
      { id: 1096, name: 'Scouters' },
      { id: 1120, name: 'Projetos Comerciais' },
      { id: 1144, name: 'Telemarketing' }
    ];

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
          // Filtro de scouters ativos + campos de foto e chave de acesso
          const stageFilter = entityType.id === 1096 ? '&filter[stageId]=DT1096_210:NEW' : '';
          // ufCrm32_1739220520381 = foto, ufCrm32_1739219729812 = chave de acesso
          const scouterFields = entityType.id === 1096 ? '&select[]=ufCrm32_1739220520381&select[]=ufCrm32_1739219729812' : '';
          const url = `https://${bitrixDomain}/rest/${bitrixToken}/crm.item.list.json?entityTypeId=${entityType.id}${stageFilter}&select[]=id&select[]=title&select[]=stageId&select[]=categoryId${scouterFields}&start=${start}`;
          
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
              console.log(`  📦 Dados da foto:`, JSON.stringify(photoData));
              
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
                  
                  // Atualizar tabela scouters (pelo bitrix_id)
                  const { error: scouterUpdateError } = await supabase
                    .from('scouters')
                    .update({
                      photo_url: photoUrl,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('bitrix_id', item.id);
                  
                  if (scouterUpdateError) {
                    console.error(
                      `  ⚠️ Erro ao atualizar tabela scouters: ${scouterUpdateError.message}`,
                    );
                  } else {
                    console.log(
                      `  ✅ Tabela scouters atualizada (bitrix_id: ${item.id})`,
                    );
                  }
                }
              }
            } catch (photoError) {
              console.error(`  ❌ Erro ao processar foto do Scouter ${item.id}:`, photoError);
            }
          }
          
          // Processar chave de acesso para Scouters
          if (entityType.id === 1096 && item.ufCrm32_1739219729812) {
            const accessKey = String(item.ufCrm32_1739219729812);
            console.log(`🔑 Chave de acesso do Scouter ${item.id} (${item.title}): ${accessKey}`);
            
            const { error: accessKeyError } = await supabase
              .from('scouters')
              .update({
                access_key: accessKey,
                updated_at: new Date().toISOString(),
              })
              .eq('bitrix_id', item.id);
            
            if (accessKeyError) {
              console.error(`  ⚠️ Erro ao atualizar access_key: ${accessKeyError.message}`);
            } else {
              console.log(`  ✅ Chave de acesso salva para scouter ${item.title}`);
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

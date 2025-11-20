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
    // 1096 = Scouters
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
          const url = `https://${bitrixDomain}/rest/${bitrixToken}/crm.item.list.json?entityTypeId=${entityType.id}&select[]=id&select[]=title&start=${start}`;
          
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
          const { error: upsertError } = await supabase
            .from('bitrix_spa_entities')
            .upsert({
              entity_type_id: entityType.id,
              bitrix_item_id: item.id,
              title: (item.title || `Item ${item.id}`).trim(),
              cached_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'entity_type_id,bitrix_item_id'
            });

          if (upsertError) {
            console.error(`❌ Erro ao inserir ${entityType.name} ID ${item.id}:`, upsertError);
            errors.push(`${entityType.name} ID ${item.id}: ${upsertError.message}`);
          } else {
            totalSynced++;
          }
        }

        console.log(`✅ ${entityType.name} sincronizados com sucesso`);

      } catch (error) {
        const errorMsg = `Erro ao sincronizar ${entityType.name}: ${error instanceof Error ? error.message : String(error)}`;
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
        message: `${totalSynced} entidades SPA sincronizadas com sucesso`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro na sincronização de entidades SPA:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: String(error)
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

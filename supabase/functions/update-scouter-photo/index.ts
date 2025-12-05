import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const bitrixDomain = Deno.env.get('BITRIX_DOMAIN');
    const bitrixToken = Deno.env.get('BITRIX_TOKEN');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { scouter_id, image_data, file_name } = await req.json();

    if (!scouter_id || !image_data) {
      return new Response(
        JSON.stringify({ error: 'scouter_id e image_data são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📸 Atualizando foto do scouter: ${scouter_id}`);

    // Buscar dados do scouter
    const { data: scouter, error: scouterError } = await supabase
      .from('scouters')
      .select('id, name, bitrix_id, photo_url')
      .eq('id', scouter_id)
      .single();

    if (scouterError || !scouter) {
      console.error('Scouter não encontrado:', scouterError);
      return new Response(
        JSON.stringify({ error: 'Scouter não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extrair dados da imagem base64
    const base64Match = image_data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      return new Response(
        JSON.stringify({ error: 'Formato de imagem inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imageType = base64Match[1];
    const base64Data = base64Match[2];
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Gerar nome do arquivo
    const timestamp = Date.now();
    const fileName = `scouter-${scouter_id}-${timestamp}.${imageType}`;
    const filePath = `scouter-photos/${fileName}`;

    console.log(`📁 Fazendo upload para: ${filePath}`);

    // Upload para o Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('scouter-photos')
      .upload(fileName, imageBuffer, {
        contentType: `image/${imageType}`,
        upsert: true
      });

    if (uploadError) {
      console.error('Erro no upload:', uploadError);
      
      // Se o bucket não existe, criar
      if (uploadError.message?.includes('not found')) {
        console.log('Criando bucket scouter-photos...');
        const { error: bucketError } = await supabase.storage.createBucket('scouter-photos', {
          public: true
        });
        
        if (bucketError && !bucketError.message?.includes('already exists')) {
          throw bucketError;
        }

        // Tentar upload novamente
        const { error: retryError } = await supabase.storage
          .from('scouter-photos')
          .upload(fileName, imageBuffer, {
            contentType: `image/${imageType}`,
            upsert: true
          });

        if (retryError) throw retryError;
      } else {
        throw uploadError;
      }
    }

    // Obter URL pública
    const { data: publicUrl } = supabase.storage
      .from('scouter-photos')
      .getPublicUrl(fileName);

    const photoUrl = publicUrl.publicUrl;
    console.log(`✅ URL pública: ${photoUrl}`);

    // Atualizar tabela scouters
    const { error: updateError } = await supabase
      .from('scouters')
      .update({ 
        photo_url: photoUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', scouter_id);

    if (updateError) {
      console.error('Erro ao atualizar scouter:', updateError);
      throw updateError;
    }

    // Sincronizar com Bitrix se configurado
    if (bitrixDomain && bitrixToken && scouter.bitrix_id) {
      console.log(`🔄 Sincronizando com Bitrix... (ID: ${scouter.bitrix_id})`);
      
      try {
        // Preparar dados da foto para o Bitrix
        // O Bitrix espera o formato: [nome_arquivo, base64_data]
        const bitrixFileData = [file_name || fileName, base64Data];

        const bitrixUrl = `https://${bitrixDomain}/rest/crm.item.update.json?auth=${bitrixToken}`;
        
        const bitrixResponse = await fetch(bitrixUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityTypeId: 1096, // Scouters SPA
            id: scouter.bitrix_id,
            fields: {
              // Campo de foto do scouter no Bitrix
              ufCrm32_1739220520381: {
                fileData: bitrixFileData
              }
            }
          })
        });

        const bitrixResult = await bitrixResponse.json();
        
        if (bitrixResult.error) {
          console.error('Erro Bitrix:', bitrixResult.error_description || bitrixResult.error);
        } else {
          console.log('✅ Foto sincronizada com Bitrix');
        }
      } catch (bitrixError) {
        console.error('Erro ao sincronizar com Bitrix:', bitrixError);
        // Não falhar a operação se o Bitrix falhar
      }
    } else {
      console.log('⚠️ Bitrix não configurado ou scouter sem bitrix_id');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        photo_url: photoUrl,
        message: 'Foto atualizada com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

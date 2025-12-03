import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PhotoSyncRequest {
  leadId: number;
  fileIds?: number[];  // Array de IDs de arquivos do Bitrix
}

// Helper para baixar e fazer upload de foto
async function downloadAndUploadPhoto(
  leadId: number,
  fileId: number,  // ID único do arquivo no Bitrix
  downloadUrl: string,
  supabase: any
): Promise<{ publicUrl: string; storagePath: string; fileSize: number }> {
  console.log(`📥 Baixando foto ${fileId} do Bitrix: ${downloadUrl}`);

  const bitrixResponse = await fetch(downloadUrl);
  
  if (!bitrixResponse.ok) {
    throw new Error(`Erro ao baixar do Bitrix: ${bitrixResponse.status} ${bitrixResponse.statusText}`);
  }

  const contentType = bitrixResponse.headers.get('content-type') || '';
  console.log(`📋 Content-Type: ${contentType}`);
  
  // 🚨 VALIDAÇÃO FORTE: Se não começar com "image/", logar body e abortar
  if (!contentType.startsWith('image/')) {
    const textBody = await bitrixResponse.text().catch(() => '<erro ao ler body>');
    console.error('❌ Conteúdo não é imagem. Body (primeiros 500 chars):');
    console.error(textBody.slice(0, 500));
    throw new Error(
      `Bitrix devolveu conteúdo não-imagem. content-type="${contentType}"`
    );
  }

  const arrayBuffer = await bitrixResponse.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  
  if (uint8.byteLength === 0) {
    throw new Error('Foto baixada está vazia');
  }

  console.log(`✅ Foto baixada: ${uint8.byteLength} bytes`);

  // Determinar extensão pela content-type
  let extension = 'jpg';
  if (contentType.includes('png')) extension = 'png';
  else if (contentType.includes('webp')) extension = 'webp';
  else if (contentType.includes('jpeg')) extension = 'jpg';
  
  // Nome único baseado no fileId do Bitrix
  const finalFileName = `lead-${leadId}-file-${fileId}.${extension}`;
  const storagePath = `photos/${finalFileName}`;

  console.log(`📤 Upload para Storage: ${storagePath}`);

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('lead-photos')
    .upload(storagePath, uint8, {
      contentType: contentType || 'image/jpeg',
      upsert: true,
      cacheControl: '3600'
    });

  if (uploadError) {
    console.error('❌ Erro no upload:', uploadError);
    throw new Error(`Erro ao fazer upload: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('lead-photos')
    .getPublicUrl(storagePath);

  const publicUrl = urlData.publicUrl;
  
  console.log(`🔗 URL pública: ${publicUrl}`);

  return { publicUrl, storagePath, fileSize: uint8.byteLength };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, fileIds }: PhotoSyncRequest = await req.json();
    
    if (!leadId) {
      throw new Error('leadId é obrigatório');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Buscar token do Bitrix do banco
    const { data: config } = await supabase
      .from('bitrix_sync_config')
      .select('webhook_url')
      .eq('active', true)
      .single();
    
    if (!config?.webhook_url) {
      throw new Error('Configuração Bitrix não encontrada');
    }
    
    // Extrair domínio e token da webhook_url
    const urlMatch = config.webhook_url.match(/https:\/\/([^\/]+)\/rest\/(.+?)\/crm\.lead\.update\.json/);
    if (!urlMatch) {
      throw new Error('Formato de webhook_url inválido');
    }
    
    const bitrixDomain = urlMatch[1];
    const bitrixToken = urlMatch[2];
    
    // Use dedicated file token if available, fallback to webhook token
    const fileToken = Deno.env.get('BITRIX_FILE_TOKEN') || bitrixToken;
    
    console.log('🔑 Bitrix config:', { domain: bitrixDomain, tokenLength: bitrixToken.length, fileTokenLength: fileToken.length });

    let photoIdsToProcess: number[] = [];
    let oldFieldPhotos: Array<{ id: number; downloadUrl?: string | null }> = [];

    // Se fileIds foram fornecidos, usar eles diretamente
    if (fileIds && fileIds.length > 0) {
      photoIdsToProcess = fileIds;
      console.log(`📸 Processar ${fileIds.length} fotos fornecidas:`, fileIds);
    } else {
      // Buscar fotos do Bitrix
      console.log(`📡 Buscando lead completo do Bitrix: crm.lead.get?ID=${leadId}`);
      const leadUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.lead.get?ID=${leadId}`;
      const leadResponse = await fetch(leadUrl);
      
      if (!leadResponse.ok) {
        throw new Error(`Erro ao buscar lead ${leadId}: ${leadResponse.status}`);
      }
      
      const leadData = await leadResponse.json();
      
      // Tentar novo campo múltiplo primeiro (UF_CRM_1764358561)
      const newPhotoField = leadData.result?.UF_CRM_1764358561;
      
      if (newPhotoField) {
        if (typeof newPhotoField === 'string') {
          // Campo múltiplo vem como string "1183610,1183732,1183734"
          photoIdsToProcess = newPhotoField.split(',').map(id => parseInt(id.trim())).filter(Boolean);
          console.log(`📸 Encontradas ${photoIdsToProcess.length} fotos no novo campo UF_CRM_1764358561`);
        } else if (Array.isArray(newPhotoField)) {
          photoIdsToProcess = newPhotoField.map(id => parseInt(id)).filter(Boolean);
          console.log(`📸 Encontradas ${photoIdsToProcess.length} fotos no novo campo (array)`);
        }
      }
      
      // Fallback para campo antigo se novo estiver vazio
      // O campo antigo pode ter estrutura: { id, showUrl, downloadUrl } ou apenas IDs
      if (photoIdsToProcess.length === 0) {
        const oldPhotoField = leadData.result?.UF_CRM_LEAD_1733231445171;
        if (Array.isArray(oldPhotoField) && oldPhotoField.length > 0) {
          console.log(`⚠️ Fallback: Campo antigo UF_CRM_LEAD_1733231445171:`, JSON.stringify(oldPhotoField).slice(0, 500));
          
          // Verificar estrutura do campo antigo
          oldFieldPhotos = oldPhotoField.map((p: any) => {
            if (typeof p === 'object' && p !== null) {
              return {
                id: p.id || p.fileId || 0,
                downloadUrl: p.downloadUrl || p.urlDownload || p.DOWNLOAD_URL || null
              };
            } else if (typeof p === 'number' || typeof p === 'string') {
              return { id: parseInt(String(p)), downloadUrl: null };
            }
            return { id: 0, downloadUrl: null };
          }).filter((p: any) => p.id > 0);
          
          console.log(`⚠️ Fallback: Encontradas ${oldFieldPhotos.length} fotos no campo antigo`);
        }
      }
    }

    // Se não há fotos do novo campo nem do antigo
    if (photoIdsToProcess.length === 0 && (!oldFieldPhotos || oldFieldPhotos.length === 0)) {
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhuma foto para sincronizar' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Processar todas as fotos
    const allPublicUrls: string[] = [];
    const allStoragePaths: string[] = [];
    let totalSize = 0;

    // Processar fotos (tentar crm.file.get primeiro, depois disk.file.get)
    for (const photoId of photoIdsToProcess) {
      try {
        console.log(`📡 Processando foto ${photoId}...`);
        
        let downloadUrl: string | null = null;
        
        // 1. Tentar crm.file.get primeiro (para arquivos de campos CRM)
        const crmFileUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.file.get?id=${photoId}`;
        console.log(`📡 Tentando crm.file.get: ${crmFileUrl}`);
        const crmResp = await fetch(crmFileUrl);
        
        if (crmResp.ok) {
          const crmJson = await crmResp.json();
          downloadUrl = crmJson.result?.downloadUrl || crmJson.result?.DOWNLOAD_URL;
          if (downloadUrl) {
            console.log(`✅ crm.file.get retornou URL para foto ${photoId}`);
          }
        }
        
        // 2. Se crm.file.get não funcionou, tentar disk.file.get
        if (!downloadUrl) {
          const diskFileUrl = `https://${bitrixDomain}/rest/${fileToken}/disk.file.get?id=${photoId}`;
          console.log(`📡 Fallback para disk.file.get: ${diskFileUrl}`);
          const diskResp = await fetch(diskFileUrl);
          
          if (diskResp.ok) {
            const diskJson = await diskResp.json();
            downloadUrl = diskJson.result?.DOWNLOAD_URL;
            if (downloadUrl) {
              console.log(`✅ disk.file.get retornou URL para foto ${photoId}`);
            }
          }
        }
        
        // 3. Se ainda não tem URL, tentar URL direta do CRM show_file.php
        if (!downloadUrl) {
          // URL padrão para arquivos CRM quando temos apenas o fileId
          downloadUrl = `https://${bitrixDomain}/bitrix/components/bitrix/crm.lead.show/show_file.php?auth=${bitrixToken}&ownerId=${leadId}&fieldName=UF_CRM_LEAD_1733231445171&dynamic=Y&fileId=${photoId}`;
          console.log(`📡 Fallback para URL direta CRM: ${downloadUrl}`);
        }
        
        if (!downloadUrl) {
          console.error(`❌ Não foi possível obter URL de download para foto ${photoId}`);
          continue;
        }
        
        // Baixar, fazer upload e obter URL pública
        const { publicUrl, storagePath, fileSize } = await downloadAndUploadPhoto(
          leadId,
          photoId,
          downloadUrl,
          supabase
        );
        
        allPublicUrls.push(publicUrl);
        allStoragePaths.push(storagePath);
        totalSize += fileSize;
        
        console.log(`✅ Foto ${photoId} sincronizada: ${publicUrl}`);
      } catch (error) {
        console.error(`❌ Erro ao processar foto ${photoId}:`, error);
      }
    }

    // Processar fotos do campo antigo (podem ter downloadUrl direto ou precisar de crm.lead.productrow.list)
    for (const photo of oldFieldPhotos || []) {
      try {
        console.log(`📡 Processando foto antiga ${photo.id}...`);
        
        let downloadUrl = photo.downloadUrl;
        
        // Se não tem downloadUrl direto, tentar buscar via disk.file.get (último recurso)
        if (!downloadUrl) {
          // Tentar crm.file.get que funciona para anexos CRM
          const crmFileUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.file.get?id=${photo.id}`;
          console.log(`📡 Tentando crm.file.get: ${crmFileUrl}`);
          const crmResp = await fetch(crmFileUrl);
          
          if (crmResp.ok) {
            const crmJson = await crmResp.json();
            downloadUrl = crmJson.result?.downloadUrl || crmJson.result?.DOWNLOAD_URL;
            console.log(`✅ crm.file.get retornou:`, JSON.stringify(crmJson.result || {}).slice(0, 200));
          }
          
          // Se crm.file.get não funcionou, tentar disk.file.get
          if (!downloadUrl) {
            const diskFileUrl = `https://${bitrixDomain}/rest/${fileToken}/disk.file.get?id=${photo.id}`;
            const diskResp = await fetch(diskFileUrl);
            
            if (diskResp.ok) {
              const diskJson = await diskResp.json();
              downloadUrl = diskJson.result?.DOWNLOAD_URL;
            }
          }
        }
        
        if (!downloadUrl) {
          console.error(`❌ Não foi possível obter URL de download para foto antiga ${photo.id}`);
          continue;
        }
        
        // Baixar, fazer upload e obter URL pública
        const { publicUrl, storagePath, fileSize } = await downloadAndUploadPhoto(
          leadId,
          photo.id,
          downloadUrl,
          supabase
        );
        
        allPublicUrls.push(publicUrl);
        allStoragePaths.push(storagePath);
        totalSize += fileSize;
        
        console.log(`✅ Foto antiga ${photo.id} sincronizada: ${publicUrl}`);
      } catch (error) {
        console.error(`❌ Erro ao processar foto antiga ${photo.id}:`, error);
      }
    }

    if (allPublicUrls.length === 0) {
      throw new Error('Nenhuma foto foi sincronizada com sucesso');
    }

    // Atualizar photo_url E additional_photos para cache
    console.log(`💾 Atualizando photo_url e additional_photos com ${allPublicUrls.length} URLs...`);
    const { error: updateError } = await supabase
      .from('leads')
      .update({ 
        photo_url: JSON.stringify(allPublicUrls),
        additional_photos: allPublicUrls  // Salvar também em additional_photos para cache rápido
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('⚠️ Erro ao atualizar lead:', updateError);
    } else {
      console.log('✅ photo_url e additional_photos atualizados com sucesso!');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        publicUrls: allPublicUrls,
        leadId,
        storagePaths: allStoragePaths,
        totalSize,
        count: allPublicUrls.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('❌ Erro detalhado ao sincronizar foto:', {
      error: errorMessage,
      stack: errorStack
    });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

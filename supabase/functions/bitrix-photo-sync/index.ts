import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PhotoSyncRequest {
  leadId: number;
  photoData?: any;  // Objeto, array ou URL direta de foto do Bitrix
}

// Helper para construir URL autenticada do Bitrix
function buildAuthenticatedDownloadUrl(
  rawUrl: string,
  bitrixDomain: string,
  bitrixToken: string | null
): string {
  const url = new URL(rawUrl, `https://${bitrixDomain}`);
  
  console.log(`🔗 URL base: ${rawUrl}`);
  console.log(`🌐 Domínio: ${bitrixDomain}`);
  console.log(`🔑 Token: ${bitrixToken ? 'presente' : 'ausente'}`);
  
  if (bitrixToken) {
    // Sempre definir ou substituir o parâmetro auth, mesmo se vier vazio
    url.searchParams.set('auth', bitrixToken);
  }
  
  const finalUrl = url.toString();
  console.log(`✅ URL final montada: ${finalUrl}`);
  
  return finalUrl;
}

// Helper para baixar e fazer upload de foto
async function downloadAndUploadPhoto(
  leadId: number,
  downloadUrl: string,
  supabase: any
): Promise<{ publicUrl: string; storagePath: string; fileSize: number }> {
  console.log(`📥 Baixando foto do Bitrix: ${downloadUrl}`);

  const bitrixResponse = await fetch(downloadUrl);
  
  if (!bitrixResponse.ok) {
    throw new Error(`Erro ao baixar do Bitrix: ${bitrixResponse.status} ${bitrixResponse.statusText}`);
  }

  // Validar Content-Type antes de processar
  const contentType = bitrixResponse.headers.get('content-type') || '';
  console.log(`📋 Content-Type recebido: ${contentType}`);
  
  if (contentType.includes('text/html')) {
    throw new Error(`URL retornou HTML ao invés de imagem. Possível erro de autenticação ou URL inválida. Content-Type: ${contentType}`);
  }
  
  if (!contentType.startsWith('image/')) {
    console.warn(`⚠️ Content-Type inesperado: ${contentType}. Tentando processar mesmo assim...`);
  }

  const photoBlob = await bitrixResponse.blob();
  
  if (photoBlob.size === 0) {
    throw new Error('Foto baixada está vazia');
  }

  console.log(`✅ Foto baixada: ${photoBlob.size} bytes, tipo: ${photoBlob.type}`);

  const mimeType = photoBlob.type || 'image/jpeg';
  const extension = mimeType.split('/')[1] || 'jpg';
  const timestamp = Date.now();
  const finalFileName = `lead-${leadId}-${timestamp}.${extension}`;
  const storagePath = `photos/${finalFileName}`;

  console.log(`📤 Upload para Storage: ${storagePath} (${photoBlob.size} bytes, ${mimeType})`);

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('lead-photos')
    .upload(storagePath, photoBlob, {
      contentType: mimeType,
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
  
  console.log(`✅ Foto sincronizada: ${publicUrl}`);

  const { error: updateError } = await supabase
    .from('leads')
    .update({ photo_url: publicUrl })
    .eq('id', leadId);

  if (updateError) {
    console.error('⚠️ Erro ao atualizar lead (foto já salva):', updateError);
  }

  return { publicUrl, storagePath, fileSize: photoBlob.size };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, photoData }: PhotoSyncRequest = await req.json();
    
    if (!leadId) {
      throw new Error('leadId é obrigatório');
    }

    if (!photoData) {
      console.log(`ℹ️ Nenhuma foto fornecida para lead ${leadId}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhuma foto para sincronizar' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
    // Formato: https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/crm.lead.update.json
    const urlMatch = config.webhook_url.match(/https:\/\/([^\/]+)\/rest\/(.+?)\/crm\.lead\.update\.json/);
    if (!urlMatch) {
      throw new Error('Formato de webhook_url inválido');
    }
    
    const bitrixDomain = urlMatch[1];
    const bitrixToken = urlMatch[2];
    
    console.log('🔑 Bitrix config:', { domain: bitrixDomain, tokenLength: bitrixToken.length });

    console.log('📸 Dados recebidos:', JSON.stringify(photoData, null, 2));

    // ✅ CASO ESPECIAL: photoData é uma string (URL direta)
    if (typeof photoData === 'string') {
      const finalDownloadUrl = buildAuthenticatedDownloadUrl(
        photoData,
        bitrixDomain,
        bitrixToken || null
      );

      console.log('🔗 URL direta recebida, usando para download:', finalDownloadUrl);

      const { publicUrl, storagePath, fileSize } = await downloadAndUploadPhoto(
        leadId,
        finalDownloadUrl,
        supabase
      );

      return new Response(
        JSON.stringify({ success: true, publicUrl, leadId, storagePath, fileSize }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ CASO NORMAL: processar array de fotos do Bitrix
    let photoArray = Array.isArray(photoData) ? photoData : [photoData];
    
    console.log(`📸 Array de fotos recebido: ${JSON.stringify(photoArray, null, 2)}`);
    
    const firstPhoto = photoArray.find(p => p?.id || p?.fileId || p?.downloadUrl || p?.showUrl);
    
    if (!firstPhoto) {
      console.log(`⚠️ Nenhuma foto válida encontrada para lead ${leadId}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhuma foto válida' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileId = firstPhoto.id || firstPhoto.fileId || null;
    let downloadUrl = firstPhoto.downloadUrl || firstPhoto.showUrl || null;

    console.log(`🔍 Foto selecionada:`, {
      fileId,
      downloadUrl,
      hasDownloadUrl: !!downloadUrl,
      hasFileId: !!fileId,
      isShowFilePhp: downloadUrl?.includes('show_file.php')
    });

    // ✅ PRIORIDADE 1: Buscar DOWNLOAD_URL diretamente do lead via API
    if (fileId) {
      try {
        console.log(`📡 Buscando informações completas do arquivo via crm.lead.get`);
        
        const leadUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.lead.get?ID=${leadId}`;
        const leadResponse = await fetch(leadUrl);
        
        if (!leadResponse.ok) {
          throw new Error(`Erro ao buscar lead: ${leadResponse.status}`);
        }
        
        const leadData = await leadResponse.json();
        console.log('📦 Dados do lead obtidos');
        
        // Procurar o campo de fotos (UF_CRM_LEAD_1733231445171)
        const photoField = leadData.result?.UF_CRM_LEAD_1733231445171;
        
        if (Array.isArray(photoField) && photoField.length > 0) {
          // Tentar encontrar a foto com o fileId correto
          const targetPhoto = photoField.find((p: any) => 
            String(p.id) === String(fileId) || String(p.fileId) === String(fileId)
          );
          
          if (targetPhoto?.downloadUrl) {
            downloadUrl = targetPhoto.downloadUrl;
            console.log(`✅ DOWNLOAD_URL encontrada no lead: ${downloadUrl}`);
          } else {
            console.warn('⚠️ Foto não encontrada no campo do lead');
          }
        }
      } catch (e) {
        console.warn('⚠️ Falha ao buscar foto do lead:', String(e));
      }
    }

    // ✅ PRIORIDADE 2: Só usar show_file.php se disk.file.get falhou
    if (!downloadUrl && firstPhoto.downloadUrl?.includes('show_file.php')) {
      console.log('⚠️ Usando fallback com show_file.php (pode não funcionar)');
      downloadUrl = firstPhoto.downloadUrl;
    }

    // ✅ PRIORIDADE 3: Fallback final para showUrl
    if (!downloadUrl && firstPhoto.showUrl) {
      downloadUrl = firstPhoto.showUrl;
      console.log('📌 Usando showUrl como fallback final');
    }

    if (!downloadUrl) {
      throw new Error('Nenhuma URL de download disponível');
    }

    const authenticatedUrl = buildAuthenticatedDownloadUrl(
      downloadUrl,
      bitrixDomain,
      bitrixToken || null
    );

    const { publicUrl, storagePath, fileSize } = await downloadAndUploadPhoto(
      leadId,
      authenticatedUrl,
      supabase
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        publicUrl,
        leadId,
        storagePath,
        fileSize
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

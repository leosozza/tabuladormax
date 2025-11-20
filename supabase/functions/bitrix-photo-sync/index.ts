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
  
  if (bitrixToken) {
    // Sempre definir ou substituir o parâmetro auth
    url.searchParams.set('auth', bitrixToken);
  }

  return url.toString();
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
    const bitrixDomain = 'maxsystem.bitrix24.com.br';
    const bitrixToken = Deno.env.get('BITRIX_REST_TOKEN')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    console.log('🔍 Extraído:', { fileId, downloadUrl });

    // ✅ PRIORIDADE 1: Tentar disk.file.get se temos fileId (com fallback)
    if (fileId) {
      try {
        console.log(`📡 Chamando disk.file.get para fileId: ${fileId}`);
        
        const diskFileUrl = `https://${bitrixDomain}/rest/9/efcbke2jhg22nkdp/disk.file.get?id=${fileId}`;
        const diskResponse = await fetch(diskFileUrl);
        
        if (!diskResponse.ok) {
          throw new Error(`Erro ao chamar disk.file.get: ${diskResponse.status} ${diskResponse.statusText}`);
        }
        
        const diskData = await diskResponse.json();
        console.log('📦 Resposta disk.file.get:', JSON.stringify(diskData, null, 2));
        
        if (diskData.result?.DOWNLOAD_URL) {
          downloadUrl = diskData.result.DOWNLOAD_URL;
          console.log(`✅ DOWNLOAD_URL obtida via disk.file.get: ${downloadUrl}`);
        } else {
          console.warn('⚠️ disk.file.get não retornou DOWNLOAD_URL');
        }
      } catch (e) {
        console.warn('⚠️ Falha ao usar disk.file.get, usando fallback com downloadUrl do Bitrix:', String(e));
      }
    }

    // ✅ PRIORIDADE 2: Usar downloadUrl original com autenticação
    if (!downloadUrl) {
      if (firstPhoto.showUrl) {
        downloadUrl = firstPhoto.showUrl;
      }
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PhotoSyncRequest {
  leadId: number;
  photoData?: any;  // Objeto ou array de foto do Bitrix
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

    // Processar array de fotos do Bitrix
    let photoArray = Array.isArray(photoData) ? photoData : [photoData];
    
    // Pegar primeira foto válida
    const firstPhoto = photoArray.find(p => p?.id || p?.fileId || p?.downloadUrl || p?.showUrl);
    
    if (!firstPhoto) {
      console.log(`⚠️ Nenhuma foto válida encontrada para lead ${leadId}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhuma foto válida' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extrair fileId e downloadUrl
    const fileId = firstPhoto.id || firstPhoto.fileId || null;
    let downloadUrl = firstPhoto.downloadUrl || firstPhoto.showUrl || null;

    console.log('🔍 Extraído:', { fileId, downloadUrl });

    // PRIORIDADE 1: Usar disk.file.get se temos fileId
    if (fileId) {
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
        console.log(`✅ DOWNLOAD_URL obtida: ${downloadUrl}`);
      } else {
        console.warn('⚠️ disk.file.get não retornou DOWNLOAD_URL');
        throw new Error('DOWNLOAD_URL não encontrada na resposta de disk.file.get');
      }
    }

    // PRIORIDADE 2: Validar que temos downloadUrl
    if (!downloadUrl) {
      throw new Error('Nenhuma URL de download disponível (sem fileId e sem downloadUrl)');
    }

    console.log(`📥 Baixando foto do Bitrix: ${downloadUrl}`);

    // Baixar foto do Bitrix
    const bitrixResponse = await fetch(downloadUrl);
    
    if (!bitrixResponse.ok) {
      throw new Error(`Erro ao baixar do Bitrix: ${bitrixResponse.status} ${bitrixResponse.statusText}`);
    }

    const photoBlob = await bitrixResponse.blob();
    
    if (photoBlob.size === 0) {
      throw new Error('Foto baixada está vazia');
    }

    console.log(`✅ Foto baixada: ${photoBlob.size} bytes, tipo: ${photoBlob.type}`);

    // Determinar extensão e nome do arquivo
    const mimeType = photoBlob.type || 'image/jpeg';
    const extension = mimeType.split('/')[1] || 'jpg';
    const timestamp = Date.now();
    const finalFileName = `lead-${leadId}-${timestamp}.${extension}`;
    const storagePath = `photos/${finalFileName}`;

    console.log(`📤 Upload para Storage: ${storagePath} (${photoBlob.size} bytes, ${mimeType})`);

    // Upload para Supabase Storage
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

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from('lead-photos')
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;
    
    console.log(`✅ Foto sincronizada: ${publicUrl}`);

    // Atualizar tabela leads com a nova URL
    const { error: updateError } = await supabase
      .from('leads')
      .update({ photo_url: publicUrl })
      .eq('id', leadId);

    if (updateError) {
      console.error('⚠️ Erro ao atualizar lead (foto já salva):', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        publicUrl,
        leadId,
        storagePath,
        fileSize: photoBlob.size
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

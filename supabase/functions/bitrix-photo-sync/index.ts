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

    // Processar array de fotos do Bitrix
    let photoArray = Array.isArray(photoData) ? photoData : [photoData];
    
    // Pegar primeira foto válida
    const firstPhoto = photoArray.find(p => p?.downloadUrl || p?.showUrl);
    
    if (!firstPhoto) {
      console.log(`⚠️ Nenhuma URL de foto válida encontrada para lead ${leadId}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhuma URL de foto válida' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construir URL de download completa
    let downloadUrl = firstPhoto.downloadUrl || firstPhoto.showUrl;
    
    // Se a URL não tem protocolo, adicionar domínio do Bitrix
    if (downloadUrl.startsWith('/')) {
      downloadUrl = `https://${bitrixDomain}${downloadUrl}`;
    }
    
    // Adicionar token de autenticação se necessário
    if (!downloadUrl.includes('auth=') && bitrixToken) {
      const separator = downloadUrl.includes('?') ? '&' : '?';
      downloadUrl = `${downloadUrl}${separator}auth=${bitrixToken}`;
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
    console.error('❌ Erro ao sincronizar foto:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

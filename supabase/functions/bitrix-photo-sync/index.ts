import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PhotoSyncRequest {
  leadId: number;
  photoData?: any;
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

  const contentType = bitrixResponse.headers.get('content-type') || '';
  console.log(`📋 Content-Type: ${contentType}`);
  
  if (contentType.includes('text/html')) {
    throw new Error(`URL retornou HTML ao invés de imagem. Content-Type: ${contentType}`);
  }

  const photoBlob = await bitrixResponse.blob();
  
  if (photoBlob.size === 0) {
    throw new Error('Foto baixada está vazia');
  }

  console.log(`✅ Foto baixada: ${photoBlob.size} bytes`);

  const mimeType = photoBlob.type || 'image/jpeg';
  const extension = mimeType.split('/')[1] || 'jpg';
  const timestamp = Date.now();
  const finalFileName = `lead-${leadId}-${timestamp}.${extension}`;
  const storagePath = `photos/${finalFileName}`;

  console.log(`📤 Upload para Storage: ${storagePath}`);

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
  
  console.log(`🔗 URL pública: ${publicUrl}`);
  console.log(`💾 Atualizando photo_url no banco...`);

  const { error: updateError } = await supabase
    .from('leads')
    .update({ photo_url: publicUrl })
    .eq('id', leadId);

  if (updateError) {
    console.error('⚠️ Erro ao atualizar lead:', updateError);
  } else {
    console.log('✅ Sincronização concluída com sucesso!');
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
    const urlMatch = config.webhook_url.match(/https:\/\/([^\/]+)\/rest\/(.+?)\/crm\.lead\.update\.json/);
    if (!urlMatch) {
      throw new Error('Formato de webhook_url inválido');
    }
    
    const bitrixDomain = urlMatch[1];
    const bitrixToken = urlMatch[2];
    
    console.log('🔑 Bitrix config:', { domain: bitrixDomain, tokenLength: bitrixToken.length });

    // ✅ PASSO 1: Buscar dados completos do lead via crm.lead.get
    console.log(`📡 Buscando lead completo do Bitrix: crm.lead.get?ID=${leadId}`);
    const leadUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.lead.get?ID=${leadId}`;
    const leadResponse = await fetch(leadUrl);
    
    if (!leadResponse.ok) {
      throw new Error(`Erro ao buscar lead ${leadId}: ${leadResponse.status}`);
    }
    
    const leadData = await leadResponse.json();
    console.log('✅ Lead obtido, extraindo fotos do campo UF_CRM_LEAD_1733231445171');
    
    // ✅ PASSO 2: Extrair campo de fotos
    const photoField = leadData.result?.UF_CRM_LEAD_1733231445171;
    
    if (!Array.isArray(photoField) || photoField.length === 0) {
      console.log('⏭️ Nenhuma foto encontrada no campo UF_CRM_LEAD_1733231445171');
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhuma foto para sincronizar' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // ✅ PASSO 3: Pegar a primeira foto e extrair fileId
    const firstPhoto = photoField[0];
    const fileId = firstPhoto.id || firstPhoto.fileId;
    
    console.log('📸 Foto encontrada:', { id: fileId });
    
    if (!fileId) {
      throw new Error('fileId não encontrado na foto');
    }
    
    // ✅ PASSO 4: Usar disk.file.getExternalLink para obter URL de download autenticada
    console.log(`📡 Chamando disk.file.getExternalLink para fileId: ${fileId}`);
    const diskLinkUrl = `https://${bitrixDomain}/rest/${bitrixToken}/disk.file.getExternalLink?id=${fileId}`;
    const diskLinkResponse = await fetch(diskLinkUrl);
    
    if (!diskLinkResponse.ok) {
      throw new Error(`Erro ao chamar disk.file.getExternalLink: ${diskLinkResponse.status}`);
    }
    
    const diskLinkData = await diskLinkResponse.json();
    console.log('📦 Resposta disk.file.getExternalLink:', JSON.stringify(diskLinkData, null, 2));
    
    if (!diskLinkData.result) {
      throw new Error('disk.file.getExternalLink não retornou link válido');
    }
    
    const downloadUrl = diskLinkData.result;
    console.log('🔗 URL de download obtida:', downloadUrl);

    // ✅ PASSO 5-9: Baixar, fazer upload e atualizar
    const { publicUrl, storagePath, fileSize } = await downloadAndUploadPhoto(
      leadId,
      downloadUrl,
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

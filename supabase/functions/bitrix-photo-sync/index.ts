import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PhotoSyncRequest {
  leadId: number;
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
  
  const timestamp = Date.now();
  const finalFileName = `lead-${leadId}-${timestamp}.${extension}`;
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

  return { publicUrl, storagePath, fileSize: uint8.byteLength };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId }: PhotoSyncRequest = await req.json();
    
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
    
    console.log('🔑 Bitrix config:', { domain: bitrixDomain, tokenLength: bitrixToken.length });

    // ✅ PASSO 1: Buscar dados completos do lead via crm.lead.get
    console.log(`📡 Buscando lead completo do Bitrix: crm.lead.get?ID=${leadId}`);
    const leadUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.lead.get?ID=${leadId}`;
    const leadResponse = await fetch(leadUrl);
    
    if (!leadResponse.ok) {
      throw new Error(`Erro ao buscar lead ${leadId}: ${leadResponse.status}`);
    }
    
    const leadData = await leadResponse.json();
    console.log('✅ Lead obtido, extraindo foto do campo UF_CRM_ID_FOTO');
    
    // ✅ PASSO 2: Extrair ID da foto pública
    const photoId = String(leadData.result?.UF_CRM_ID_FOTO || '').trim();
    
    if (!photoId) {
      console.log('⏭️ Nenhuma foto encontrada no campo UF_CRM_ID_FOTO');
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhuma foto para sincronizar' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('📸 Foto encontrada - ID:', photoId);
    
    // ✅ PASSO 3: Usar disk.file.get para obter DOWNLOAD_URL autenticada
    console.log(`📡 Chamando disk.file.get para fileId: ${photoId}`);
    const diskFileUrl = `https://${bitrixDomain}/rest/${bitrixToken}/disk.file.get?id=${photoId}`;
    const diskResp = await fetch(diskFileUrl);
    
    if (!diskResp.ok) {
      throw new Error(`Erro ao chamar disk.file.get: ${diskResp.status}`);
    }
    
    const diskJson = await diskResp.json();
    console.log('📁 Resposta disk.file.get:', JSON.stringify(diskJson, null, 2));
    
    const downloadUrl = diskJson.result?.DOWNLOAD_URL;
    
    if (!downloadUrl) {
      throw new Error('disk.file.get não retornou DOWNLOAD_URL. Verifique permissões do arquivo.');
    }
    
    console.log('🔗 DOWNLOAD_URL obtida:', downloadUrl);

    // ✅ PASSO 4-7: Baixar, fazer upload e atualizar
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

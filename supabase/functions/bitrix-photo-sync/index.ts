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
    // ⚠️ IMPORTANTE: Log completo do campo de foto para debug
    console.log('📸 Campo UF_CRM_LEAD_1733231445171 COMPLETO:', JSON.stringify(photoField, null, 2));
    
    // ✅ PASSO 3: Pegar a primeira foto e extrair fileId
    const firstPhoto = photoField[0];
    console.log('📸 Primeira foto (objeto completo):', JSON.stringify(firstPhoto, null, 2));
    
    const fileId = firstPhoto.id || firstPhoto.fileId;
    
    console.log('📸 Foto encontrada:', { id: fileId });
    
    if (!fileId) {
      throw new Error('fileId não encontrado na foto');
    }
    
    // ⚠️ PROBLEMA CONFIRMADO: disk.file.get retorna 401 com webhook
    // Webhooks NÃO têm permissão para acessar API Disk do Bitrix
    throw new Error(
      `[BLOQUEIO] Webhook não tem permissão para disk.file.get. ` +
      `Campo foto: ${JSON.stringify(firstPhoto)}. ` +
      `Soluções: 1) Processar foto no app antes de enviar ao Bitrix, ` +
      `2) Usar OAuth2 ao invés de webhook, ` +
      `3) Bitrix disponibilizar URL pública no campo.`
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

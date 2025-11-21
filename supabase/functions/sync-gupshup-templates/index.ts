import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GupshupTemplate {
  id: string;
  elementName: string;
  languageCode: string;
  category: string;
  status: string;
  data: string;
  vertical?: string;
  templateType?: string;
}

interface GupshupApiResponse {
  status: string;
  templates: GupshupTemplate[];
}

// Extrair variáveis do template body ({{1}}, {{2}}, etc)
function extractVariables(templateBody: string): Array<{ index: number; name: string; example: string }> {
  const matches = [...templateBody.matchAll(/\{\{(\d+)\}\}/g)];
  const variables: Array<{ index: number; name: string; example: string }> = [];
  
  for (const match of matches) {
    const index = parseInt(match[1]);
    if (!variables.find(v => v.index === index)) {
      variables.push({
        index,
        name: `Variável ${index}`,
        example: ''
      });
    }
  }
  
  return variables.sort((a, b) => a.index - b.index);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Gupshup credentials
    const gupshupApiKey = Deno.env.get('GUPSHUP_API_KEY');
    const gupshupAppId = Deno.env.get('GUPSHUP_APP_ID');

    if (!gupshupApiKey || !gupshupAppId) {
      throw new Error('GUPSHUP_API_KEY ou GUPSHUP_APP_ID não configurados');
    }

    console.log('🔄 Sincronizando templates do Gupshup...');

    // Buscar templates da API Gupshup
    const gupshupResponse = await fetch(
      `https://api.gupshup.io/wa/app/${gupshupAppId}/templates`,
      {
        method: 'GET',
        headers: {
          'apikey': gupshupApiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!gupshupResponse.ok) {
      const errorText = await gupshupResponse.text();
      console.error('❌ Erro ao buscar templates do Gupshup:', errorText);
      throw new Error(`Erro na API Gupshup: ${gupshupResponse.status} - ${errorText}`);
    }

    const gupshupData: GupshupApiResponse = await gupshupResponse.json();
    
    if (!gupshupData.templates || !Array.isArray(gupshupData.templates)) {
      throw new Error('Resposta inválida da API Gupshup');
    }

    console.log(`📥 ${gupshupData.templates.length} templates encontrados no Gupshup`);

    // Inicializar Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let syncedCount = 0;
    let errorCount = 0;

    // Processar cada template
    for (const template of gupshupData.templates) {
      try {
        const variables = extractVariables(template.data);
        
        const { error } = await supabase
          .from('gupshup_templates')
          .upsert({
            template_id: template.id,
            element_name: template.elementName,
            display_name: template.elementName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            language_code: template.languageCode || 'pt_BR',
            category: template.category,
            status: template.status,
            template_body: template.data,
            variables: variables,
            metadata: {
              vertical: template.vertical,
              templateType: template.templateType
            },
            synced_at: new Date().toISOString()
          }, {
            onConflict: 'template_id'
          });

        if (error) {
          console.error(`❌ Erro ao sincronizar template ${template.elementName}:`, error);
          errorCount++;
        } else {
          console.log(`✅ Template sincronizado: ${template.elementName}`);
          syncedCount++;
        }
      } catch (err) {
        console.error(`❌ Erro ao processar template ${template.elementName}:`, err);
        errorCount++;
      }
    }

    console.log(`✅ Sincronização concluída: ${syncedCount} templates sincronizados, ${errorCount} erros`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${syncedCount} templates sincronizados com sucesso`,
        synced: syncedCount,
        errors: errorCount,
        total: gupshupData.templates.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: errorDetails
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
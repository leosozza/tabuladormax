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
    const gupshupSourceNumber = Deno.env.get('GUPSHUP_SOURCE_NUMBER');

    if (!gupshupApiKey || !gupshupAppId) {
      throw new Error('GUPSHUP_API_KEY ou GUPSHUP_APP_ID não configurados');
    }

    // Check if this is a test_connection request
    let body: { action?: string } = {};
    try {
      body = await req.json();
    } catch {
      // No body or invalid JSON, proceed with sync
    }

    if (body.action === 'test_connection') {
      console.log('🔍 Testando conexão com Gupshup...');
      
      // Test API connection by fetching templates (lightweight call)
      const testUrl = `https://api.gupshup.io/wa/app/${gupshupAppId}/template`;
      const testResponse = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'apikey': gupshupApiKey,
          'accept': 'application/json',
        },
      });

      if (testResponse.ok) {
        return new Response(
          JSON.stringify({
            success: true,
            connected: true,
            sourceNumber: gupshupSourceNumber || null,
            message: 'Conexão com Gupshup estabelecida'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const errorText = await testResponse.text();
        return new Response(
          JSON.stringify({
            success: false,
            connected: false,
            error: `API retornou status ${testResponse.status}: ${errorText}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('🔄 Sincronizando templates do Gupshup...');
    console.log('📱 App ID:', gupshupAppId);

    // Buscar templates da API Gupshup
    // Endpoint principal: GET https://api.gupshup.io/wa/app/{app_id}/template
    const primaryUrl = `https://api.gupshup.io/wa/app/${gupshupAppId}/template`;
    console.log('🌐 Chamando Gupshup URL principal:', primaryUrl);

    let gupshupData: GupshupApiResponse | null = null;

    // Chamada principal (API nova)
    const primaryResponse = await fetch(primaryUrl, {
      method: 'GET',
      headers: {
        'apikey': gupshupApiKey,
        'accept': 'application/json',
      },
    });

    if (primaryResponse.ok) {
      gupshupData = (await primaryResponse.json()) as GupshupApiResponse;
      console.log('✅ Resposta da API Gupshup (endpoint principal) recebida com sucesso');
    } else {
      const primaryErrorText = await primaryResponse.text();
      console.error(
        `❌ Erro ao buscar templates (endpoint principal - status ${primaryResponse.status}):`,
        primaryErrorText,
      );

      // Se for 404, tentar endpoint legado
      if (primaryResponse.status === 404) {
        const legacyUrl = new URL('https://api.gupshup.io/wa/api/v1/templates');
        legacyUrl.searchParams.append('appName', gupshupAppId);
        console.log('🌐 Tentando endpoint legado Gupshup URL:', legacyUrl.toString());

        const legacyResponse = await fetch(legacyUrl.toString(), {
          method: 'GET',
          headers: {
            'apikey': gupshupApiKey,
            'accept': 'application/json',
          },
        });

        if (!legacyResponse.ok) {
          const legacyErrorText = await legacyResponse.text();
          console.error(
            `❌ Erro ao buscar templates (endpoint legado - status ${legacyResponse.status}):`,
            legacyErrorText,
          );
          throw new Error(
            `Erro na API Gupshup (principal e legado falharam): ` +
              `principal ${primaryResponse.status} - ${primaryErrorText}; ` +
              `legado ${legacyResponse.status} - ${legacyErrorText}`,
          );
        }

        gupshupData = (await legacyResponse.json()) as GupshupApiResponse;
        console.log('✅ Resposta da API Gupshup (endpoint legado) recebida com sucesso');
      } else {
        throw new Error(`Erro na API Gupshup: ${primaryResponse.status} - ${primaryErrorText}`);
      }
    }

    if (!gupshupData || !gupshupData.templates || !Array.isArray(gupshupData.templates)) {
      console.error('❌ Resposta inválida da API Gupshup (sem campo templates array):', gupshupData);
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
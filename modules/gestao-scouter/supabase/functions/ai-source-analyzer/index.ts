import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 [AI-SOURCE-ANALYZER] Analisando estrutura do projeto...');

    // LIMITAÇÃO: Deno Deploy não permite acesso ao filesystem
    // Esta função retorna metadados conhecidos sobre a estrutura do projeto
    // Em produção, o contexto principal virá do banco de dados e logs

    const projectStructure = {
      components: {
        path: 'src/components',
        known_files: [
          'ai-debug/ErrorCaptureModal.tsx',
          'ai-debug/ErrorHuntIndicator.tsx',
          'ai-debug/ErrorHuntOverlay.tsx',
          'ai-debug/AIDebugPanel.tsx',
          'leads/CreateLeadDialog.tsx',
          'dashboard/PerformanceDashboard.tsx',
          'shared/DataTable.tsx',
        ],
        description: 'React components da aplicação'
      },
      hooks: {
        path: 'src/hooks',
        known_files: [
          'useLeads.ts',
          'useScouters.ts',
          'useAuth.ts',
          'useToast.ts',
        ],
        description: 'Custom React hooks'
      },
      contexts: {
        path: 'src/contexts',
        known_files: [
          'ErrorHuntContext.tsx',
          'AuthContext.tsx',
        ],
        description: 'React contexts'
      },
      utils: {
        path: 'src/utils',
        known_files: [
          'ai-analysis.ts',
          'formatters.ts',
          'geo/parseCoordinates.ts',
        ],
        description: 'Utility functions'
      },
      edge_functions: {
        path: 'supabase/functions',
        known_functions: [
          'ai-analyze-error',
          'ai-database-inspector',
          'ai-log-aggregator',
          'ai-source-analyzer',
          'csv-import-leads',
          'enrich-pending-leads',
        ],
        description: 'Supabase Edge Functions'
      },
      note: 'Estrutura conhecida do projeto. Acesso ao filesystem não disponível no Deno Deploy.'
    };

    return new Response(
      JSON.stringify({
        success: true,
        structure: projectStructure,
        timestamp: new Date().toISOString(),
        warning: 'Filesystem access not available in Deno Deploy. Use database inspector and log aggregator for rich context.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ [AI-SOURCE-ANALYZER] Erro:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

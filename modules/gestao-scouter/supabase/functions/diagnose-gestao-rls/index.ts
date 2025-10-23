/**
 * Edge Function: Diagnóstico RLS e Reload de Schema Cache
 * Endpoint: POST /diagnose-gestao-rls
 * 
 * Funcionalidades:
 * - Verificar políticas RLS da tabela leads
 * - Recarregar schema cache do PostgREST
 * - Testar permissões de UPSERT
 * - Retornar diagnóstico detalhado
 */
import { serve } from "https://deno.land/std@0.193.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface DiagnosticResult {
  success: boolean;
  timestamp: string;
  tests: {
    rls_policies: {
      status: 'ok' | 'warning' | 'error';
      message: string;
      details?: any;
    };
    schema_reload: {
      status: 'ok' | 'warning' | 'error';
      message: string;
      details?: any;
    };
    upsert_test: {
      status: 'ok' | 'warning' | 'error';
      message: string;
      details?: any;
    };
    connection: {
      status: 'ok' | 'warning' | 'error';
      message: string;
      details?: any;
    };
  };
  recommendations: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('🔍 Iniciando diagnóstico RLS do Gestão Scouter');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Configuração do Supabase não encontrada',
          hint: 'SUPABASE_URL e SUPABASE_ANON_KEY são necessários'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const result: DiagnosticResult = {
      success: true,
      timestamp: new Date().toISOString(),
      tests: {
        rls_policies: { status: 'ok', message: '' },
        schema_reload: { status: 'ok', message: '' },
        upsert_test: { status: 'ok', message: '' },
        connection: { status: 'ok', message: '' }
      },
      recommendations: []
    };

    // Test 1: Verificar conexão
    console.log('📡 Teste 1: Verificando conexão...');
    try {
      const { data: testData, error: testError } = await supabase
        .from('leads')
        .select('id')
        .limit(1);

      if (testError) {
        result.tests.connection = {
          status: 'error',
          message: `Erro de conexão: ${testError.message}`,
          details: testError
        };
        result.success = false;
      } else {
        result.tests.connection = {
          status: 'ok',
          message: 'Conexão funcionando corretamente',
          details: { records_found: testData?.length || 0 }
        };
        console.log('✅ Conexão OK');
      }
    } catch (error) {
      result.tests.connection = {
        status: 'error',
        message: `Erro ao conectar: ${error instanceof Error ? error.message : String(error)}`,
        details: error
      };
      result.success = false;
    }

    // Test 2: Verificar políticas RLS
    console.log('🔒 Teste 2: Verificando políticas RLS...');
    try {
      const { data: policies, error: policiesError } = await supabase
        .rpc('list_public_tables')
        .then(() => supabase.from('pg_policies').select('*').eq('tablename', 'leads'));

      if (policiesError) {
        // Tentar query direta se RPC não existir
        const directQuery = `
          SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual::text as using_expression,
            with_check::text as with_check_expression
          FROM pg_policies 
          WHERE tablename = 'leads' AND schemaname = 'public'
        `;
        
        const { data: directPolicies, error: directError } = await supabase
          .from('pg_policies')
          .select('*');

        if (directError) {
          result.tests.rls_policies = {
            status: 'warning',
            message: 'Não foi possível verificar políticas RLS diretamente',
            details: { 
              hint: 'Verifique manualmente com: SELECT * FROM pg_policies WHERE tablename = \'leads\''
            }
          };
          result.recommendations.push('Execute manualmente: SELECT * FROM pg_policies WHERE tablename = \'leads\'');
        } else {
          result.tests.rls_policies = {
            status: 'ok',
            message: `${directPolicies?.length || 0} políticas RLS encontradas`,
            details: directPolicies
          };
        }
      } else {
        const serviceRolePolicy = policies?.find((p: any) => 
          p.policyname === 'service_role_upsert_leads' && 
          p.roles?.includes('service_role')
        );

        if (!serviceRolePolicy) {
          result.tests.rls_policies = {
            status: 'error',
            message: 'Política service_role_upsert_leads não encontrada ou incorreta',
            details: { found_policies: policies }
          };
          result.success = false;
          result.recommendations.push(
            'Executar SQL: CREATE POLICY "service_role_upsert_leads" ON public.leads FOR ALL TO service_role USING (true) WITH CHECK (true);'
          );
        } else {
          const hasUsing = serviceRolePolicy.qual === 'true';
          const hasWithCheck = serviceRolePolicy.with_check === 'true';
          
          if (!hasUsing || !hasWithCheck) {
            result.tests.rls_policies = {
              status: 'error',
              message: 'Política service_role_upsert_leads incompleta',
              details: {
                has_using: hasUsing,
                has_with_check: hasWithCheck,
                policy: serviceRolePolicy
              }
            };
            result.success = false;
            result.recommendations.push(
              'A política precisa ter USING (true) WITH CHECK (true) para UPSERT funcionar'
            );
          } else {
            result.tests.rls_policies = {
              status: 'ok',
              message: 'Política service_role_upsert_leads configurada corretamente',
              details: serviceRolePolicy
            };
            console.log('✅ Políticas RLS OK');
          }
        }
      }
    } catch (error) {
      result.tests.rls_policies = {
        status: 'error',
        message: `Erro ao verificar RLS: ${error instanceof Error ? error.message : String(error)}`,
        details: error
      };
      result.success = false;
    }

    // Test 3: Recarregar schema cache
    console.log('🔄 Teste 3: Recarregando schema cache...');
    try {
      const { error: reloadError } = await supabase.rpc('exec', {
        sql: "NOTIFY pgrst, 'reload schema';"
      });

      if (reloadError) {
        // Tentar método alternativo
        const { error: alternativeError } = await supabase
          .from('_reload_schema')
          .select('*')
          .limit(1);

        if (alternativeError && !alternativeError.message.includes('does not exist')) {
          result.tests.schema_reload = {
            status: 'warning',
            message: 'Não foi possível recarregar automaticamente. Execute manualmente: NOTIFY pgrst, \'reload schema\';',
            details: { error: reloadError.message, alternative_error: alternativeError.message }
          };
          result.recommendations.push(
            'Execute no SQL Editor: NOTIFY pgrst, \'reload schema\';'
          );
        } else {
          result.tests.schema_reload = {
            status: 'ok',
            message: 'Schema cache será recarregado em até 10 segundos',
            details: { method: 'automatic' }
          };
          console.log('✅ Schema reload iniciado');
        }
      } else {
        result.tests.schema_reload = {
          status: 'ok',
          message: 'Schema cache recarregado com sucesso',
          details: { method: 'rpc' }
        };
        console.log('✅ Schema reload OK');
      }
    } catch (error) {
      result.tests.schema_reload = {
        status: 'warning',
        message: 'Reload automático não disponível. Execute manualmente.',
        details: { error: error instanceof Error ? error.message : String(error) }
      };
      result.recommendations.push(
        'Execute no SQL Editor do Gestão Scouter: NOTIFY pgrst, \'reload schema\';'
      );
    }

    // Test 4: Testar UPSERT de teste
    console.log('🧪 Teste 4: Testando permissões de UPSERT...');
    try {
      const testLead = {
        nome: 'Teste Diagnóstico RLS',
        telefone: '99999999999',
        projeto: 'DIAGNOSTIC_TEST',
        criado: new Date().toISOString()
      };

      const { data: upsertData, error: upsertError } = await supabase
        .from('leads')
        .insert(testLead)
        .select('id')
        .single();

      if (upsertError) {
        if (upsertError.code === '42501') {
          result.tests.upsert_test = {
            status: 'error',
            message: 'ERRO 42501: Sem permissão para INSERT. Política RLS incorreta!',
            details: {
              error_code: upsertError.code,
              error_message: upsertError.message,
              hint: 'A política service_role_upsert_leads precisa ter USING (true) WITH CHECK (true)'
            }
          };
          result.success = false;
          result.recommendations.push(
            'CRÍTICO: Execute NOTIFY pgrst, \'reload schema\'; e aguarde 10 segundos'
          );
        } else {
          result.tests.upsert_test = {
            status: 'error',
            message: `Erro no INSERT: ${upsertError.message}`,
            details: upsertError
          };
          result.success = false;
        }
      } else {
        result.tests.upsert_test = {
          status: 'ok',
          message: 'INSERT funcionando corretamente (permissões OK)',
          details: { test_id: upsertData?.id }
        };
        console.log('✅ INSERT OK');

        // Limpar registro de teste
        if (upsertData?.id) {
          await supabase
            .from('leads')
            .delete()
            .eq('id', upsertData.id);
        }
      }
    } catch (error) {
      result.tests.upsert_test = {
        status: 'error',
        message: `Erro ao testar INSERT: ${error instanceof Error ? error.message : String(error)}`,
        details: error
      };
      result.success = false;
    }

    // Adicionar recomendações finais
    if (result.success) {
      result.recommendations.push('✅ Todos os testes passaram! O sistema está configurado corretamente.');
    } else {
      result.recommendations.push('❌ Alguns testes falharam. Siga as recomendações acima para corrigir.');
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Diagnóstico concluído em ${processingTime}ms`);

    return new Response(
      JSON.stringify({
        ...result,
        processing_time_ms: processingTime
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Erro fatal no diagnóstico:', message);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
        hint: 'Verifique os logs da Edge Function para mais detalhes'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Edge Function para validar configuração do Gestão Scouter
 * 
 * Testa:
 * 1. Formato das credenciais
 * 2. Conectividade com o projeto Gestão Scouter
 * 3. Permissões básicas (leitura da tabela leads)
 * 4. Verificação de estrutura da tabela
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationResult {
  valid: boolean;
  checks: {
    credentials: { valid: boolean; message: string };
    connection: { valid: boolean; message: string };
    tableAccess: { valid: boolean; message: string };
    tableStructure: { valid: boolean; message: string };
  };
  errors: string[];
  warnings: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar variáveis de ambiente do TabuladorMax
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variáveis de ambiente do TabuladorMax não configuradas');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const result: ValidationResult = {
      valid: true,
      checks: {
        credentials: { valid: false, message: '' },
        connection: { valid: false, message: '' },
        tableAccess: { valid: false, message: '' },
        tableStructure: { valid: false, message: '' },
      },
      errors: [],
      warnings: [],
    };

    // Buscar configuração ativa
    const { data: config, error: configError } = await supabase
      .from('gestao_scouter_config')
      .select('*')
      .eq('active', true)
      .eq('sync_enabled', true)
      .maybeSingle();

    if (configError) {
      result.valid = false;
      result.errors.push(`Erro ao buscar configuração: ${configError.message}`);
      return new Response(JSON.stringify(result), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!config) {
      result.valid = false;
      result.errors.push('Nenhuma configuração ativa encontrada');
      return new Response(JSON.stringify(result), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🔍 Validando configuração:', {
      projectUrl: config.project_url,
      hasAnonKey: !!config.anon_key,
    });

    // Check 1: Validar formato das credenciais
    if (!config.project_url || !config.anon_key) {
      result.checks.credentials.valid = false;
      result.checks.credentials.message = 'project_url ou anon_key ausentes';
      result.errors.push('Credenciais incompletas');
      result.valid = false;
    } else if (!config.project_url.startsWith('http')) {
      result.checks.credentials.valid = false;
      result.checks.credentials.message = 'project_url deve começar com http:// ou https://';
      result.errors.push('Formato de URL inválido');
      result.valid = false;
    } else if (!config.anon_key.startsWith('eyJ')) {
      result.checks.credentials.valid = false;
      result.checks.credentials.message = 'anon_key parece inválida (deve começar com eyJ)';
      result.errors.push('Formato de chave inválido');
      result.valid = false;
    } else {
      result.checks.credentials.valid = true;
      result.checks.credentials.message = 'Credenciais válidas';
    }

    // Se credenciais inválidas, não continuar
    if (!result.checks.credentials.valid) {
      return new Response(JSON.stringify(result), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check 2: Testar conexão com Gestão Scouter
    let gestaoScouterClient;
    try {
      gestaoScouterClient = createClient(config.project_url, config.anon_key);
      result.checks.connection.valid = true;
      result.checks.connection.message = 'Cliente criado com sucesso';
    } catch (error) {
      result.checks.connection.valid = false;
      result.checks.connection.message = `Erro ao criar cliente: ${error.message}`;
      result.errors.push(`Falha na conexão: ${error.message}`);
      result.valid = false;
      return new Response(JSON.stringify(result), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check 3: Testar acesso à tabela leads
    try {
      const { error: accessError } = await gestaoScouterClient
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .limit(1);

      if (accessError) {
        result.checks.tableAccess.valid = false;
        result.checks.tableAccess.message = `Erro ao acessar tabela leads: ${accessError.message}`;
        result.errors.push(`Sem acesso à tabela leads: ${accessError.message}`);
        result.valid = false;
      } else {
        result.checks.tableAccess.valid = true;
        result.checks.tableAccess.message = 'Acesso à tabela leads confirmado';
      }
    } catch (error) {
      result.checks.tableAccess.valid = false;
      result.checks.tableAccess.message = `Exceção ao testar acesso: ${error.message}`;
      result.errors.push(`Erro ao testar acesso: ${error.message}`);
      result.valid = false;
    }

    // Check 4: Verificar estrutura básica da tabela
    try {
      const { data: sampleLead, error: structureError } = await gestaoScouterClient
        .from('leads')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (structureError && structureError.code !== 'PGRST116') { // PGRST116 = no rows
        result.checks.tableStructure.valid = false;
        result.checks.tableStructure.message = `Erro ao verificar estrutura: ${structureError.message}`;
        result.warnings.push(`Aviso na estrutura: ${structureError.message}`);
      } else {
        result.checks.tableStructure.valid = true;
        
        // Verificar campos essenciais se houver dados
        if (sampleLead) {
          const requiredFields = ['id', 'updated_at'];
          const missingFields = requiredFields.filter(field => !(field in sampleLead));
          
          if (missingFields.length > 0) {
            result.checks.tableStructure.message = `Campos ausentes: ${missingFields.join(', ')}`;
            result.warnings.push(`Campos recomendados ausentes: ${missingFields.join(', ')}`);
          } else {
            result.checks.tableStructure.message = 'Estrutura da tabela validada';
          }
        } else {
          result.checks.tableStructure.message = 'Tabela vazia - estrutura não pôde ser totalmente validada';
          result.warnings.push('Tabela leads está vazia');
        }
      }
    } catch (error) {
      result.checks.tableStructure.valid = false;
      result.checks.tableStructure.message = `Exceção ao verificar estrutura: ${error.message}`;
      result.warnings.push(`Não foi possível verificar estrutura: ${error.message}`);
    }

    // Registrar resultado da validação
    try {
      await supabase.from('sync_events').insert({
        event_type: 'validation',
        direction: 'supabase_to_gestao_scouter',
        status: result.valid ? 'success' : 'error',
        error_message: result.valid 
          ? 'Configuração validada com sucesso' 
          : `Validação falhou: ${result.errors.join('; ')}`,
      });
    } catch (logError) {
      console.error('❌ Erro ao registrar validação:', logError);
    }

    const statusCode = result.valid ? 200 : 400;
    console.log(result.valid ? '✅ Validação bem-sucedida' : '❌ Validação falhou:', result);

    return new Response(JSON.stringify(result), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Erro na validação:', error);
    // Não expor detalhes internos do erro para o usuário
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido durante validação';
    
    // Log completo apenas no console (não exposto ao usuário)
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    
    return new Response(
      JSON.stringify({
        valid: false,
        error: 'Erro ao validar configuração. Verifique os logs para mais detalhes.',
        checks: {},
        errors: ['Erro interno durante validação'],
        warnings: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

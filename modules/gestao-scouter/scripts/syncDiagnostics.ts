#!/usr/bin/env node
/**
 * Script de Diagnóstico de Sincronização
 * =======================================
 * 
 * Valida configuração, conectividade e permissões para sincronização
 * entre TabuladorMax (origem) e Gestão Scouter (destino).
 * 
 * Testes executados:
 * - Validação de variáveis de ambiente
 * - Health check de leitura (TabuladorMax)
 * - Health check de escrita (Gestão Scouter) - opcional
 * - Amostragem e normalização de dados (dry-run)
 * 
 * Uso:
 * ----
 * npm run diagnostics:sync           # Dry-run (não grava)
 * npm run diagnostics:sync:write     # Testa escrita
 * npx tsx scripts/syncDiagnostics.ts --sample 50 --write-check
 * 
 * Flags:
 * ------
 * --dry-run          Apenas simula, não grava (padrão: true)
 * --write-check      Habilita teste de escrita
 * --sample N         Número de registros para amostra (padrão: 10)
 * --verbose          Exibe logs detalhados
 * --help             Mostra ajuda
 * 
 * Códigos de Saída:
 * -----------------
 * 0 = Sucesso total
 * 1 = Warnings (pode prosseguir)
 * 2 = Erro fatal (corrigir antes de prosseguir)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// ============================================================================
// Configuração
// ============================================================================

interface DiagnosticConfig {
  dryRun: boolean;
  writeCheck: boolean;
  sampleSize: number;
  verbose: boolean;
}

interface DiagnosticResult {
  step: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
  message: string;
  details?: Record<string, unknown>;
  latencyMs?: number;
}

interface Lead {
  id: string | number;
  nome?: string;
  telefone?: string;
  email?: string;
  idade?: string | number;
  projeto?: string;
  scouter?: string;
  supervisor?: string;
  localizacao?: string;
  latitude?: number;
  longitude?: number;
  local_da_abordagem?: string;
  criado?: string;
  valor_ficha?: number;
  etapa?: string;
  ficha_confirmada?: string;
  foto?: string;
  updated_at?: string;
  created_at?: string;
  [key: string]: unknown;
}

interface Ficha {
  id: string;
  nome?: string;
  telefone?: string;
  email?: string;
  idade?: string;
  projeto?: string;
  scouter?: string;
  supervisor?: string;
  localizacao?: string;
  latitude?: number;
  longitude?: number;
  local_da_abordagem?: string;
  criado?: string;
  valor_ficha?: number;
  etapa?: string;
  ficha_confirmada?: string;
  foto?: string;
  raw: Record<string, unknown>;
  updated_at?: string;
  deleted: boolean;
  sync_source?: string;
  last_synced_at?: string;
}

// ============================================================================
// Parse de Argumentos
// ============================================================================

function parseArgs(): DiagnosticConfig {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
🔍 Script de Diagnóstico de Sincronização

Uso:
  npm run diagnostics:sync           # Dry-run (não grava)
  npm run diagnostics:sync:write     # Testa escrita
  npx tsx scripts/syncDiagnostics.ts [flags]

Flags:
  --dry-run          Apenas simula, não grava (padrão: true)
  --write-check      Habilita teste de escrita
  --sample N         Número de registros para amostra (padrão: 10)
  --verbose          Exibe logs detalhados
  --help             Mostra esta ajuda

Exemplos:
  npx tsx scripts/syncDiagnostics.ts --sample 50
  npx tsx scripts/syncDiagnostics.ts --write-check --verbose
  npx tsx scripts/syncDiagnostics.ts --sample 100 --write-check

Códigos de Saída:
  0 = Sucesso total
  1 = Warnings (pode prosseguir com cautela)
  2 = Erro fatal (corrigir antes de prosseguir)
`);
    process.exit(0);
  }

  const config: DiagnosticConfig = {
    dryRun: !args.includes('--write-check'),
    writeCheck: args.includes('--write-check'),
    sampleSize: 10,
    verbose: args.includes('--verbose')
  };

  const sampleIndex = args.indexOf('--sample');
  if (sampleIndex !== -1 && args[sampleIndex + 1]) {
    config.sampleSize = parseInt(args[sampleIndex + 1], 10) || 10;
  }

  return config;
}

// ============================================================================
// Funções de Diagnóstico
// ============================================================================

/**
 * Valida variáveis de ambiente obrigatórias
 */
function validateEnvironment(): DiagnosticResult[] {
  const results: DiagnosticResult[] = [];
  
  const required = {
    'TABULADOR_URL': process.env.TABULADOR_URL,
    'TABULADOR_SERVICE_KEY': process.env.TABULADOR_SERVICE_KEY,
    'VITE_SUPABASE_URL': process.env.VITE_SUPABASE_URL,
    'VITE_SUPABASE_SERVICE_KEY': process.env.VITE_SUPABASE_SERVICE_KEY
  };

  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      results.push({
        step: `env.${key}`,
        status: 'FAIL',
        message: `Variável ${key} não configurada`
      });
    } else if (!value.startsWith('http') && key.includes('URL')) {
      results.push({
        step: `env.${key}`,
        status: 'FAIL',
        message: `${key} deve ser uma URL válida (https://)`
      });
    } else if (key.includes('KEY') && value.length < 100) {
      results.push({
        step: `env.${key}`,
        status: 'WARN',
        message: `${key} parece muito curta (esperado: JWT longo)`
      });
    } else {
      results.push({
        step: `env.${key}`,
        status: 'PASS',
        message: `${key} configurada`,
        details: {
          value: key.includes('KEY') 
            ? `${value.substring(0, 10)}... (${value.length} chars)` 
            : value
        }
      });
    }
  }

  // Verificar se URLs são diferentes
  if (process.env.TABULADOR_URL === process.env.VITE_SUPABASE_URL) {
    results.push({
      step: 'env.urls_different',
      status: 'FAIL',
      message: 'TABULADOR_URL e VITE_SUPABASE_URL são iguais! Devem ser projetos diferentes.'
    });
  } else if (process.env.TABULADOR_URL && process.env.VITE_SUPABASE_URL) {
    results.push({
      step: 'env.urls_different',
      status: 'PASS',
      message: 'URLs de projetos diferentes confirmadas'
    });
  }

  return results;
}

/**
 * Testa leitura na origem (TabuladorMax)
 */
async function testReadOrigin(client: SupabaseClient): Promise<DiagnosticResult> {
  const start = Date.now();
  
  try {
    const { data, error, count } = await client
      .from('leads')
      .select('id, nome, telefone, email, projeto, scouter, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(1);

    const latency = Date.now() - start;

    if (error) {
      return {
        step: 'read_origin',
        status: 'FAIL',
        message: `Erro ao ler de TabuladorMax: ${error.message}`,
        details: { error, code: error.code },
        latencyMs: latency
      };
    }

    return {
      step: 'read_origin',
      status: 'PASS',
      message: 'Leitura em TabuladorMax bem-sucedida',
      details: {
        totalRecords: count || 0,
        sampleData: data?.[0] || null
      },
      latencyMs: latency
    };
  } catch (err) {
    return {
      step: 'read_origin',
      status: 'FAIL',
      message: `Exceção ao conectar com TabuladorMax: ${err}`,
      latencyMs: Date.now() - start
    };
  }
}

/**
 * Testa leitura no destino (Gestão Scouter)
 */
async function testReadDestination(client: SupabaseClient): Promise<DiagnosticResult> {
  const start = Date.now();
  
  try {
    const { data, error, count } = await client
      .from('leads')
      .select('id, nome, telefone, email, projeto, scouter, created_at, deleted', { count: 'exact' })
      .eq('deleted', false)
      .order('created_at', { ascending: false })
      .limit(1);

    const latency = Date.now() - start;

    if (error) {
      return {
        step: 'read_destination',
        status: 'FAIL',
        message: `Erro ao ler de Gestão Scouter: ${error.message}`,
        details: { error, code: error.code },
        latencyMs: latency
      };
    }

    return {
      step: 'read_destination',
      status: 'PASS',
      message: 'Leitura em Gestão Scouter bem-sucedida',
      details: {
        totalRecords: count || 0,
        sampleData: data?.[0] || null
      },
      latencyMs: latency
    };
  } catch (err) {
    return {
      step: 'read_destination',
      status: 'FAIL',
      message: `Exceção ao conectar com Gestão Scouter: ${err}`,
      latencyMs: Date.now() - start
    };
  }
}

/**
 * Testa escrita no destino (Gestão Scouter)
 */
async function testWriteDestination(client: SupabaseClient): Promise<DiagnosticResult> {
  const start = Date.now();
  const testId = '__diagnostic_sync__';
  
  try {
    // 1. Upsert registro sintético
    const { error: upsertError } = await client
      .from('leads')
      .upsert({
        id: testId,
        nome: 'Test Sync Diagnostic',
        deleted: false,
        sync_source: 'diagnostics',
        updated_at: new Date().toISOString()
      });

    if (upsertError) {
      return {
        step: 'write_destination',
        status: 'FAIL',
        message: `Erro ao inserir registro de teste: ${upsertError.message}`,
        details: { error: upsertError },
        latencyMs: Date.now() - start
      };
    }

    // 2. Verificar se foi criado
    const { data: verifyData, error: verifyError } = await client
      .from('leads')
      .select('id, nome, sync_source')
      .eq('id', testId)
      .single();

    if (verifyError || !verifyData) {
      return {
        step: 'write_destination',
        status: 'FAIL',
        message: 'Registro de teste não foi encontrado após inserção',
        details: { verifyError },
        latencyMs: Date.now() - start
      };
    }

    // 3. Remover (cleanup)
    const { error: deleteError } = await client
      .from('leads')
      .delete()
      .eq('id', testId);

    if (deleteError) {
      return {
        step: 'write_destination',
        status: 'WARN',
        message: 'Escrita OK, mas falha ao limpar registro de teste',
        details: { deleteError },
        latencyMs: Date.now() - start
      };
    }

    return {
      step: 'write_destination',
      status: 'PASS',
      message: 'Escrita em Gestão Scouter bem-sucedida (upsert + delete)',
      details: {
        operations: ['INSERT', 'SELECT', 'DELETE'],
        testRecord: verifyData
      },
      latencyMs: Date.now() - start
    };
  } catch (err) {
    return {
      step: 'write_destination',
      status: 'FAIL',
      message: `Exceção ao testar escrita: ${err}`,
      latencyMs: Date.now() - start
    };
  }
}

/**
 * Busca amostra de leads e testa normalização
 */
async function testSampleAndNormalize(
  originClient: SupabaseClient,
  sampleSize: number,
  verbose: boolean
): Promise<DiagnosticResult> {
  const start = Date.now();
  
  try {
    // Buscar amostra
    const { data: leads, error } = await originClient
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(sampleSize);

    if (error) {
      return {
        step: 'sample_normalize',
        status: 'FAIL',
        message: `Erro ao buscar amostra: ${error.message}`,
        latencyMs: Date.now() - start
      };
    }

    if (!leads || leads.length === 0) {
      return {
        step: 'sample_normalize',
        status: 'WARN',
        message: 'Nenhum lead encontrado para amostragem',
        latencyMs: Date.now() - start
      };
    }

    // Normalizar dados
    const normalized: Ficha[] = [];
    const warnings: string[] = [];

    for (const lead of leads) {
      try {
        const ficha = normalizeLeadToFicha(lead);
        normalized.push(ficha);
      } catch (err) {
        warnings.push(`Lead ${lead.id}: ${err}`);
      }
    }

    const latency = Date.now() - start;

    // Preview dos primeiros registros
    const preview = normalized.slice(0, 3).map(f => ({
      id: f.id,
      nome: f.nome,
      telefone: f.telefone,
      projeto: f.projeto,
      scouter: f.scouter,
      criado: f.criado,
      sync_source: f.sync_source
    }));

    if (verbose) {
      console.log('\n📋 PREVIEW DE PAYLOAD (primeiros 3 registros):');
      console.log(JSON.stringify(preview, null, 2));
    }

    return {
      step: 'sample_normalize',
      status: warnings.length > 0 ? 'WARN' : 'PASS',
      message: `Normalização concluída: ${normalized.length}/${leads.length} registros`,
      details: {
        totalSampled: leads.length,
        normalized: normalized.length,
        warnings: warnings.length > 0 ? warnings : undefined,
        preview: preview
      },
      latencyMs: latency
    };
  } catch (err) {
    return {
      step: 'sample_normalize',
      status: 'FAIL',
      message: `Exceção durante amostragem: ${err}`,
      latencyMs: Date.now() - start
    };
  }
}

/**
 * Normaliza um lead para o formato de ficha
 */
function normalizeLeadToFicha(lead: Lead): Ficha {
  // Normalizar data para formato ISO completo
  let criadoNormalized: string | undefined;
  if (lead.criado) {
    try {
      const date = new Date(lead.criado);
      if (!isNaN(date.getTime())) {
        criadoNormalized = date.toISOString();
      }
    } catch (e) {
      console.warn(`Erro ao normalizar data para lead ${lead.id}:`, e);
    }
  }

  return {
    id: String(lead.id),
    nome: lead.nome,
    telefone: lead.telefone,
    email: lead.email,
    idade: lead.idade ? String(lead.idade) : undefined,
    projeto: lead.projeto,
    scouter: lead.scouter,
    supervisor: lead.supervisor,
    localizacao: lead.localizacao,
    latitude: lead.latitude,
    longitude: lead.longitude,
    local_da_abordagem: lead.local_da_abordagem,
    criado: criadoNormalized,
    valor_ficha: lead.valor_ficha,
    etapa: lead.etapa,
    ficha_confirmada: lead.ficha_confirmada,
    foto: lead.foto,
    raw: lead,
    updated_at: lead.updated_at || new Date().toISOString(),
    deleted: false,
    sync_source: 'TabuladorMax',
    last_synced_at: new Date().toISOString()
  };
}

// ============================================================================
// Formatação de Resultados
// ============================================================================

function formatResult(result: DiagnosticResult, verbose: boolean): string {
  const icon = {
    'PASS': '✅',
    'FAIL': '❌',
    'WARN': '⚠️',
    'SKIP': '⏭️'
  }[result.status];

  let output = `  ${icon} ${result.status}: ${result.message}`;
  
  if (result.latencyMs !== undefined) {
    output += ` (${result.latencyMs}ms)`;
  }

  if (verbose && result.details) {
    output += `\n     Details: ${JSON.stringify(result.details, null, 2)
      .split('\n')
      .join('\n     ')}`;
  }

  return output;
}

function printSummary(results: DiagnosticResult[], config: DiagnosticConfig) {
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const warnCount = results.filter(r => r.status === 'WARN').length;
  const skipCount = results.filter(r => r.status === 'SKIP').length;

  console.log('\n' + '='.repeat(80));
  
  if (failCount > 0) {
    console.log('❌ DIAGNÓSTICO FALHOU');
  } else if (warnCount > 0) {
    console.log('⚠️ DIAGNÓSTICO CONCLUÍDO COM AVISOS');
  } else {
    console.log('✅ DIAGNÓSTICO CONCLUÍDO COM SUCESSO');
  }

  console.log('\n📊 Resumo:');
  console.log(`  - Testes Executados: ${results.length}`);
  console.log(`  - ✅ Passou: ${passCount}`);
  console.log(`  - ❌ Falhou: ${failCount}`);
  console.log(`  - ⚠️ Avisos: ${warnCount}`);
  console.log(`  - ⏭️ Ignorados: ${skipCount}`);

  if (failCount === 0 && warnCount === 0) {
    console.log('\n💡 Próximos Passos:');
    console.log('  1. ✅ Sistema pronto para sincronização!');
    if (config.dryRun && !config.writeCheck) {
      console.log('  2. Execute com --write-check para testar escrita');
    }
    console.log('  3. Execute npm run migrate:leads para sincronização inicial');
    console.log('  4. Configure triggers para sincronização em tempo real');
  } else if (failCount > 0) {
    console.log('\n🛠️ Ações Necessárias:');
    console.log('  1. Corrija os erros listados acima');
    console.log('  2. Consulte docs/SYNC_DIAGNOSTICS.md para troubleshooting');
    console.log('  3. Execute o diagnóstico novamente após correções');
  } else if (warnCount > 0) {
    console.log('\n⚠️ Avisos Encontrados:');
    console.log('  1. Revise os avisos acima');
    console.log('  2. Avalie se são críticos para seu caso de uso');
    console.log('  3. Consulte docs/SYNC_DIAGNOSTICS.md se necessário');
  }

  console.log('\n📚 Documentação:');
  console.log('  - Análise Completa: docs/ANALISE_SYNC_TABULADOR.md');
  console.log('  - Guia de Diagnóstico: docs/SYNC_DIAGNOSTICS.md');
  console.log('  - Scripts: scripts/README.md');

  // Código de saída
  let exitCode = 0;
  if (failCount > 0) exitCode = 2;
  else if (warnCount > 0) exitCode = 1;

  console.log(`\nCódigo de Saída: ${exitCode} (${
    exitCode === 0 ? 'sucesso' : 
    exitCode === 1 ? 'warnings' : 
    'erro fatal'
  })`);
  console.log('='.repeat(80));

  return exitCode;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('🔍 DIAGNÓSTICO DE SINCRONIZAÇÃO');
  console.log('='.repeat(80));
  
  const config = parseArgs();
  
  if (config.verbose) {
    console.log('\n⚙️ Configuração:');
    console.log(`  - Dry Run: ${config.dryRun}`);
    console.log(`  - Write Check: ${config.writeCheck}`);
    console.log(`  - Sample Size: ${config.sampleSize}`);
    console.log(`  - Verbose: ${config.verbose}`);
  }

  const allResults: DiagnosticResult[] = [];

  // [1/5] Validar variáveis de ambiente
  console.log('\n[1/5] Validando Variáveis de Ambiente...');
  const envResults = validateEnvironment();
  allResults.push(...envResults);
  envResults.forEach(r => console.log(formatResult(r, config.verbose)));

  // Se falhou na validação, parar aqui
  if (envResults.some(r => r.status === 'FAIL')) {
    const exitCode = printSummary(allResults, config);
    process.exit(exitCode);
  }

  // Criar clientes Supabase
  const tabuladorClient = createClient(
    process.env.TABULADOR_URL!,
    process.env.TABULADOR_SERVICE_KEY!
  );

  const gestaoClient = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_SERVICE_KEY!
  );

  // [2/5] Testar leitura em TabuladorMax
  console.log('\n[2/5] Testando Leitura em TabuladorMax (public.leads)...');
  const readOriginResult = await testReadOrigin(tabuladorClient);
  allResults.push(readOriginResult);
  console.log(formatResult(readOriginResult, config.verbose));

  // [3/5] Testar leitura em Gestão Scouter
  console.log('\n[3/5] Testando Leitura em Gestão Scouter (public.fichas)...');
  const readDestResult = await testReadDestination(gestaoClient);
  allResults.push(readDestResult);
  console.log(formatResult(readDestResult, config.verbose));

  // [4/5] Testar escrita em Gestão Scouter (se habilitado)
  if (config.writeCheck) {
    console.log('\n[4/5] Testando Escrita em Gestão Scouter (public.fichas)...');
    const writeDestResult = await testWriteDestination(gestaoClient);
    allResults.push(writeDestResult);
    console.log(formatResult(writeDestResult, config.verbose));
  } else {
    console.log('\n[4/5] Teste de Escrita (SKIPPED - use --write-check)');
    allResults.push({
      step: 'write_destination',
      status: 'SKIP',
      message: 'Teste de escrita não executado (use --write-check)'
    });
  }

  // [5/5] Amostragem e normalização
  console.log(`\n[5/5] Buscando Amostra de Leads (${config.sampleSize} registros)...`);
  const sampleResult = await testSampleAndNormalize(
    tabuladorClient,
    config.sampleSize,
    config.verbose
  );
  allResults.push(sampleResult);
  console.log(formatResult(sampleResult, config.verbose));

  // Resumo final
  const exitCode = printSummary(allResults, config);
  process.exit(exitCode);
}

// Executar
main().catch(err => {
  console.error('\n💥 ERRO FATAL:');
  console.error(err);
  process.exit(2);
});

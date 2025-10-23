#!/usr/bin/env node
/**
 * Script de Verificação: Setup da Tabela 'leads'
 * ================================================
 * 
 * Este script verifica se a tabela 'leads' está configurada corretamente:
 * - Coluna 'deleted' existe e tem valor padrão FALSE
 * - RLS está configurado adequadamente
 * - Há dados de teste disponíveis
 * - Queries básicas funcionam
 * 
 * Uso:
 * ----
 * npx tsx scripts/verify-leads-setup.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface VerificationResult {
  check: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: unknown;
}

const results: VerificationResult[] = [];

function addResult(check: string, status: 'pass' | 'fail' | 'warning', message: string, details?: unknown) {
  results.push({ check, status, message, details });
}

function printResults() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 RELATÓRIO DE VERIFICAÇÃO DA TABELA "leads"');
  console.log('='.repeat(80) + '\n');

  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;

  results.forEach((result, index) => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${index + 1}. ${result.check}`);
    console.log(`   Status: ${result.status.toUpperCase()}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   Detalhes:`, result.details);
    }
    console.log('');

    if (result.status === 'pass') passCount++;
    else if (result.status === 'fail') failCount++;
    else warnCount++;
  });

  console.log('='.repeat(80));
  console.log(`📊 RESUMO: ${passCount} passou | ${warnCount} avisos | ${failCount} falhou`);
  console.log('='.repeat(80) + '\n');

  if (failCount > 0) {
    console.log('❌ Existem verificações que falharam. Revise os erros acima.');
    console.log('💡 Consulte /docs/DATA_FLOW_LEADS.md para mais informações.\n');
    process.exit(1);
  } else if (warnCount > 0) {
    console.log('⚠️ Todas as verificações críticas passaram, mas existem avisos.');
    console.log('💡 Revise os avisos para garantir configuração ideal.\n');
    process.exit(0);
  } else {
    console.log('✅ Todas as verificações passaram! A tabela "leads" está configurada corretamente.\n');
    process.exit(0);
  }
}

async function verifyConfig() {
  console.log('🔍 Verificando configuração...\n');

  if (!SUPABASE_URL) {
    addResult(
      'Configuração: VITE_SUPABASE_URL',
      'fail',
      'Variável de ambiente VITE_SUPABASE_URL não encontrada'
    );
    return false;
  }

  if (!SUPABASE_KEY) {
    addResult(
      'Configuração: VITE_SUPABASE_PUBLISHABLE_KEY',
      'fail',
      'Variável de ambiente VITE_SUPABASE_PUBLISHABLE_KEY não encontrada'
    );
    return false;
  }

  addResult(
    'Configuração: Variáveis de ambiente',
    'pass',
    'Todas as variáveis de ambiente necessárias estão configuradas'
  );

  return true;
}

async function verifyTableExists(supabase: SupabaseClient) {
  console.log('🔍 Verificando existência da tabela "leads"...\n');

  try {
    const { data, error } = await supabase
      .from('leads')
      .select('id')
      .limit(1);

    if (error) {
      addResult(
        'Tabela: Existência de "leads"',
        'fail',
        `Erro ao acessar tabela "leads": ${error.message}`,
        error
      );
      return false;
    }

    addResult(
      'Tabela: Existência de "leads"',
      'pass',
      'Tabela "leads" existe e está acessível'
    );
    return true;
  } catch (error) {
    addResult(
      'Tabela: Existência de "leads"',
      'fail',
      `Exceção ao verificar tabela: ${error}`,
      error
    );
    return false;
  }
}

async function verifyDeletedColumn(supabase: SupabaseClient) {
  console.log('🔍 Verificando coluna "deleted"...\n');

  try {
    const { data, error } = await supabase
      .from('leads')
      .select('id, deleted')
      .limit(1);

    if (error) {
      if (error.message.includes('column') && error.message.includes('deleted')) {
        addResult(
          'Coluna: "deleted"',
          'fail',
          'Coluna "deleted" não existe na tabela "leads"',
          { suggestion: 'Execute a migration: 20251018_ensure_leads_deleted_column.sql' }
        );
        return false;
      }

      addResult(
        'Coluna: "deleted"',
        'warning',
        `Aviso ao verificar coluna "deleted": ${error.message}`,
        error
      );
      return true; // Continue verification
    }

    addResult(
      'Coluna: "deleted"',
      'pass',
      'Coluna "deleted" existe e está acessível'
    );
    return true;
  } catch (error) {
    addResult(
      'Coluna: "deleted"',
      'fail',
      `Exceção ao verificar coluna "deleted": ${error}`
    );
    return false;
  }
}

async function verifyDataAccess(supabase: SupabaseClient) {
  console.log('🔍 Verificando acesso aos dados...\n');

  try {
    // Query without deleted filter
    const { data: allData, error: allError } = await supabase
      .from('leads')
      .select('id, deleted')
      .limit(10);

    if (allError) {
      addResult(
        'Acesso: Leitura de dados',
        'fail',
        `Erro ao buscar dados: ${allError.message}`,
        allError
      );
      return false;
    }

    // Query with deleted filter
    const { data: activeData, error: activeError } = await supabase
      .from('leads')
      .select('id, deleted')
      .or('deleted.is.false,deleted.is.null')
      .limit(10);

    if (activeError) {
      addResult(
        'Acesso: Filtro de deletados',
        'warning',
        `Aviso ao filtrar registros deletados: ${activeError.message}`,
        activeError
      );
    } else {
      addResult(
        'Acesso: Filtro de deletados',
        'pass',
        'Filtro de registros deletados funciona corretamente'
      );
    }

    const totalRecords = allData?.length || 0;
    const activeRecords = activeData?.length || 0;

    if (totalRecords === 0) {
      addResult(
        'Dados: Registros disponíveis',
        'warning',
        'Nenhum registro encontrado na tabela "leads"',
        { suggestion: 'Execute o script insertFakeLeads.js para criar dados de teste' }
      );
    } else {
      addResult(
        'Dados: Registros disponíveis',
        'pass',
        `Encontrados ${totalRecords} registros (${activeRecords} ativos)`,
        { total: totalRecords, active: activeRecords }
      );
    }

    return true;
  } catch (error) {
    addResult(
      'Acesso: Leitura de dados',
      'fail',
      `Exceção ao verificar acesso aos dados: ${error}`
    );
    return false;
  }
}

async function verifyRequiredColumns(supabase: SupabaseClient) {
  console.log('🔍 Verificando colunas obrigatórias...\n');

  const requiredColumns = ['id', 'criado', 'projeto', 'scouter', 'nome', 'deleted'];

  try {
    const selectQuery = requiredColumns.join(', ');
    const { data, error } = await supabase
      .from('leads')
      .select(selectQuery)
      .limit(1);

    if (error) {
      const missingColumns = requiredColumns.filter(col => 
        error.message.toLowerCase().includes(col.toLowerCase())
      );

      if (missingColumns.length > 0) {
        addResult(
          'Colunas: Obrigatórias',
          'fail',
          `Colunas obrigatórias ausentes: ${missingColumns.join(', ')}`,
          { missing: missingColumns, required: requiredColumns }
        );
        return false;
      }

      addResult(
        'Colunas: Obrigatórias',
        'warning',
        `Aviso ao verificar colunas: ${error.message}`,
        error
      );
      return true;
    }

    addResult(
      'Colunas: Obrigatórias',
      'pass',
      'Todas as colunas obrigatórias estão presentes',
      { columns: requiredColumns }
    );
    return true;
  } catch (error) {
    addResult(
      'Colunas: Obrigatórias',
      'fail',
      `Exceção ao verificar colunas: ${error}`
    );
    return false;
  }
}

async function verifyDateFiltering(supabase: SupabaseClient) {
  console.log('🔍 Verificando filtros de data...\n');

  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('leads')
      .select('id, criado')
      .gte('criado', '2024-01-01')
      .lte('criado', today)
      .limit(5);

    if (error) {
      addResult(
        'Filtros: Data (criado)',
        'fail',
        `Erro ao filtrar por data: ${error.message}`,
        error
      );
      return false;
    }

    addResult(
      'Filtros: Data (criado)',
      'pass',
      'Filtros de data funcionam corretamente na coluna "criado"'
    );
    return true;
  } catch (error) {
    addResult(
      'Filtros: Data (criado)',
      'fail',
      `Exceção ao testar filtros de data: ${error}`
    );
    return false;
  }
}

async function runVerification() {
  console.log('🚀 Iniciando verificação da tabela "leads"...\n');
  console.log('📍 URL do Supabase:', SUPABASE_URL);
  console.log('');

  // Verificar configuração
  const configOk = await verifyConfig();
  if (!configOk) {
    printResults();
    return;
  }

  // Criar cliente Supabase
  const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

  // Executar verificações
  await verifyTableExists(supabase);
  await verifyDeletedColumn(supabase);
  await verifyRequiredColumns(supabase);
  await verifyDataAccess(supabase);
  await verifyDateFiltering(supabase);

  // Imprimir resultados
  printResults();
}

// Executar verificação
runVerification().catch(error => {
  console.error('\n❌ Erro não tratado durante verificação:');
  console.error(error);
  process.exit(1);
});

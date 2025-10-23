#!/usr/bin/env node
/**
 * Script de Migração/Sincronização: TabuladorMax Leads → Gestão Scouter Leads
 * ============================================================================
 * 
 * ⚠️ IMPORTANTE: FONTE ÚNICA DE VERDADE - Tabela 'leads'
 * =======================================================
 * Este script sincroniza dados da tabela 'leads' do TabuladorMax para a 
 * tabela 'leads' do Gestão Scouter (projeto Supabase local).
 * 
 * APÓS EXECUTAR ESTE SCRIPT:
 * - TODA a aplicação deve buscar dados da tabela 'leads' (Supabase local)
 * - NUNCA use a tabela 'fichas' (deprecated/migrada para 'leads')
 * - NUNCA use 'bitrix_leads' como fonte principal
 * - NUNCA use MockDataService em produção
 * 
 * Este script realiza a primeira carga ou sincronização de dados da tabela 
 * 'leads' do TabuladorMax para a tabela 'leads' do Gestão Scouter,
 * normalizando tipos de dados e mantendo backup JSON no campo 'raw'.
 * 
 * Pré-requisitos:
 * ---------------
 * 1. Node.js 18+
 * 2. Variáveis de ambiente configuradas no arquivo .env:
 *    - TABULADOR_URL: URL do projeto TabuladorMax
 *    - TABULADOR_SERVICE_KEY: Service role key do TabuladorMax
 *    - VITE_SUPABASE_URL: URL do projeto Gestão Scouter
 *    - VITE_SUPABASE_SERVICE_KEY: Service role key do Gestão Scouter
 * 
 * Uso:
 * ----
 * npm install @supabase/supabase-js dotenv
 * node scripts/syncLeadsToFichas.ts
 * 
 * ou com tsx (recomendado):
 * npm install -g tsx
 * tsx scripts/syncLeadsToFichas.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// ============================================================================
// Configuração
// ============================================================================

const TABULADOR_URL = process.env.TABULADOR_URL;
const TABULADOR_SERVICE_KEY = process.env.TABULADOR_SERVICE_KEY;
const GESTAO_URL = process.env.VITE_SUPABASE_URL;
const GESTAO_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_KEY;

const BATCH_SIZE = 1000; // Processar em lotes de 1000 registros
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

// ============================================================================
// Validação de Configuração
// ============================================================================

function validateConfig() {
  const errors: string[] = [];

  if (!TABULADOR_URL) errors.push('TABULADOR_URL não configurada');
  if (!TABULADOR_SERVICE_KEY) errors.push('TABULADOR_SERVICE_KEY não configurada');
  if (!GESTAO_URL) errors.push('VITE_SUPABASE_URL não configurada');
  if (!GESTAO_SERVICE_KEY) errors.push('VITE_SUPABASE_SERVICE_KEY não configurada');

  if (errors.length > 0) {
    console.error('❌ Erro de configuração:');
    errors.forEach(err => console.error(`   - ${err}`));
    console.error('\n💡 Configure as variáveis de ambiente no arquivo .env');
    process.exit(1);
  }
}

// ============================================================================
// Tipos
// ============================================================================

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
  [key: string]: unknown; // Permitir campos adicionais
}

interface LeadRecord {
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
}

interface MigrationStats {
  totalLeads: number;
  processed: number;
  inserted: number;
  updated: number;
  errors: number;
  startTime: Date;
  endTime?: Date;
}

// ============================================================================
// Funções Auxiliares
// ============================================================================

/**
 * Normaliza um lead do TabuladorMax para o formato da tabela 'leads' local
 */
function normalizeLeadToFicha(lead: Lead): LeadRecord {
  // Normalizar data para formato YYYY-MM-DD (date only, not timestamp)
  let criadoNormalized: string | undefined;
  if (lead.criado) {
    try {
      const date = new Date(lead.criado);
      if (!isNaN(date.getTime())) {
        criadoNormalized = date.toISOString().split('T')[0]; // YYYY-MM-DD format
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
    raw: lead, // Backup completo do registro original
    updated_at: lead.updated_at || new Date().toISOString(),
    deleted: false,
  };
}

/**
 * Aguarda um delay (para retry)
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Exibe progresso da migração
 */
function displayProgress(stats: MigrationStats) {
  const percentage = ((stats.processed / stats.totalLeads) * 100).toFixed(1);
  const elapsed = Date.now() - stats.startTime.getTime();
  const rate = stats.processed / (elapsed / 1000);
  const eta = stats.totalLeads - stats.processed > 0 
    ? ((stats.totalLeads - stats.processed) / rate) 
    : 0;

  console.log(
    `📊 Progresso: ${stats.processed}/${stats.totalLeads} (${percentage}%) | ` +
    `✅ Inseridos: ${stats.inserted} | 🔄 Atualizados: ${stats.updated} | ` +
    `❌ Erros: ${stats.errors} | ` +
    `⚡ ${rate.toFixed(1)} reg/s | ` +
    `⏱️  ETA: ${Math.ceil(eta)}s`
  );
}

// ============================================================================
// Funções Principais
// ============================================================================

/**
 * Busca todos os leads da tabela de origem
 */
async function fetchAllLeads(tabuladorClient: ReturnType<typeof createClient>): Promise<Lead[]> {
  console.log('📥 Buscando leads da tabela de origem...');
  
  const allLeads: Lead[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await tabuladorClient
      .from('leads')
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar leads (página ${page}): ${error.message}`);
    }

    if (data && data.length > 0) {
      allLeads.push(...data);
      console.log(`   Página ${page + 1}: ${data.length} registros`);
      page++;
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Total de ${allLeads.length} leads encontrados\n`);
  return allLeads;
}

/**
 * Processa um lote de leads e faz upsert na tabela 'leads' do Gestão Scouter
 */
async function processBatch(
  gestaoClient: ReturnType<typeof createClient>,
  batch: Lead[],
  stats: MigrationStats,
  attempt = 1
): Promise<void> {
  try {
    // Normalizar leads do TabuladorMax para formato da tabela leads local
    const leadsNormalized = batch.map(normalizeLeadToFicha);

    console.log(`   📦 Processando lote de ${leadsNormalized.length} registros...`);
    console.log(`   🗂️  Tabela alvo: "leads" (Gestão Scouter)`);

    // Fazer upsert na tabela 'leads'
    const { data, error } = await gestaoClient
      .from('leads')
      .upsert(leadsNormalized, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select('id');

    if (error) {
      throw error;
    }

    // Atualizar estatísticas
    stats.inserted += data?.length || 0;
    stats.processed += batch.length;

  } catch (error) {
    if (attempt < RETRY_ATTEMPTS) {
      console.warn(`⚠️  Erro no lote, tentando novamente (${attempt}/${RETRY_ATTEMPTS})...`);
      await delay(RETRY_DELAY_MS * attempt);
      return processBatch(gestaoClient, batch, stats, attempt + 1);
    } else {
      console.error(`❌ Erro ao processar lote após ${RETRY_ATTEMPTS} tentativas:`, error);
      stats.errors += batch.length;
      stats.processed += batch.length;
    }
  }
}

/**
 * Executa a migração/sincronização completa
 */
async function runMigration() {
  console.log('🚀 Iniciando sincronização TabuladorMax Leads → Gestão Scouter Leads\n');
  console.log('📋 Fonte: TabuladorMax (tabela leads)');
  console.log('🎯 Destino: Gestão Scouter (tabela leads)');
  console.log('=' .repeat(80));

  // Validar configuração
  validateConfig();

  // Criar clientes Supabase
  const tabuladorClient = createClient(TABULADOR_URL!, TABULADOR_SERVICE_KEY!);
  const gestaoClient = createClient(GESTAO_URL!, GESTAO_SERVICE_KEY!);

  console.log('✅ Clientes Supabase configurados');
  console.log(`   TabuladorMax: ${TABULADOR_URL}`);
  console.log(`   Gestão Scouter: ${GESTAO_URL}\n`);

  try {
    // Buscar todos os leads
    const leads = await fetchAllLeads(tabuladorClient);

    if (leads.length === 0) {
      console.log('⚠️  Nenhum lead encontrado para migrar');
      return;
    }

    // Inicializar estatísticas
    const stats: MigrationStats = {
      totalLeads: leads.length,
      processed: 0,
      inserted: 0,
      updated: 0,
      errors: 0,
      startTime: new Date(),
    };

    console.log('🔄 Iniciando processamento em lotes...\n');

    // Processar em lotes
    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      const batch = leads.slice(i, i + BATCH_SIZE);
      await processBatch(gestaoClient, batch, stats);
      displayProgress(stats);
    }

    stats.endTime = new Date();

    // Relatório final
    console.log('\n' + '=' .repeat(80));
    console.log('✅ MIGRAÇÃO CONCLUÍDA\n');
    console.log(`📊 Estatísticas:`);
    console.log(`   Total de leads: ${stats.totalLeads}`);
    console.log(`   Processados: ${stats.processed}`);
    console.log(`   Inseridos/Atualizados: ${stats.inserted}`);
    console.log(`   Erros: ${stats.errors}`);
    console.log(`   Taxa de sucesso: ${((stats.inserted / stats.totalLeads) * 100).toFixed(2)}%`);
    
    const duration = (stats.endTime.getTime() - stats.startTime.getTime()) / 1000;
    console.log(`   Tempo total: ${duration.toFixed(2)}s`);
    console.log(`   Taxa média: ${(stats.totalLeads / duration).toFixed(1)} registros/s`);
    console.log('=' .repeat(80));

  } catch (error) {
    console.error('\n❌ Erro fatal durante a migração:');
    console.error(error);
    process.exit(1);
  }
}

// ============================================================================
// Execução
// ============================================================================

// Executar apenas se for o script principal
// Verifica se o script está sendo executado diretamente ou importado
const isMainModule = process.argv[1] && process.argv[1].endsWith('syncLeadsToFichas.ts');

if (isMainModule) {
  runMigration().catch(error => {
    console.error('❌ Erro não tratado:', error);
    process.exit(1);
  });
}

export { runMigration, normalizeLeadToFicha };

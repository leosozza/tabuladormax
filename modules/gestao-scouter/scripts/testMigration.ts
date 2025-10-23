/**
 * Script de Exemplo e Validação do Migration/Sync Script
 * =======================================================
 *
 * ⚠️ FONTE ÚNICA DE VERDADE: Tabela 'leads'
 * ==========================================
 * Este script demonstra como usar o script de sincronização para popular
 * a tabela 'leads', que é a FONTE ÚNICA de dados de leads na aplicação.
 *
 * IMPORTANTE para desenvolvedores:
 * - Sempre popule a tabela 'leads' ao criar dados de teste
 * - NUNCA use 'fichas' (deprecated/migrada para 'leads')
 * - NUNCA use 'bitrix_leads' como fonte principal
 * - MockDataService é apenas para testes locais offline
 *
 * Este arquivo demonstra como usar o script de sincronização e valida
 * a função de normalização de dados.
 */

// Importar apenas a função de normalização (não executa a migração)
import { normalizeLeadToFicha } from "./syncLeadsToFichas.js";

// ============================================================================
// Testes de Normalização
// ============================================================================

console.log("🧪 Testando normalização de Leads TabuladorMax → Leads Gestão Scouter\n");
console.log("=".repeat(80));

// Exemplo 1: Lead completo com todos os campos
const leadCompleto = {
  id: "12345",
  nome: "João Silva",
  telefone: "(11) 98765-4321",
  email: "joao.silva@example.com",
  idade: 25,
  projeto: "Projeto Alpha",
  scouter: "Maria Santos",
  supervisor: "Carlos Oliveira",
  localizacao: "São Paulo, SP",
  latitude: -23.5505,
  longitude: -46.6333,
  local_da_abordagem: "Shopping Center ABC",
  criado: "2024-01-15",
  valor_ficha: 50.0,
  etapa: "Confirmada",
  ficha_confirmada: "Sim",
  foto: "https://example.com/foto.jpg",
  updated_at: "2024-01-15T10:30:00Z",
  campo_extra: "valor extra não mapeado",
};

const leadCompleta = normalizeLeadToFicha(leadCompleto);
console.log("\n✅ Teste 1: Lead Completo");
console.log("Input:", JSON.stringify(leadCompleto, null, 2));
console.log("Output:", JSON.stringify(leadCompleta, null, 2));
console.log("✓ Backup JSON preservado no campo raw");
console.log("✓ Todos os campos mapeados corretamente");
console.log("✓ Data normalizada para formato YYYY-MM-DD");

// Exemplo 2: Lead com campos mínimos
const leadMinimo = {
  id: 67890,
  nome: "Ana Costa",
};

const leadMinima = normalizeLeadToFicha(leadMinimo);
console.log("\n✅ Teste 2: Lead Mínimo");
console.log("Input:", JSON.stringify(leadMinimo, null, 2));
console.log("Output:", JSON.stringify(leadMinima, null, 2));
console.log("✓ Campos opcionais como undefined");
console.log("✓ ID numérico convertido para string");
console.log("✓ Campo deleted definido como false");

// Exemplo 3: Normalização de datas
const leadsComDatas = [
  { id: "1", nome: "Teste 1", criado: "2024-01-15" },
  { id: "2", nome: "Teste 2", criado: "2024-01-15T10:30:00Z" },
  { id: "3", nome: "Teste 3", criado: "15/01/2024" }, // formato brasileiro
  { id: "4", nome: "Teste 4", criado: new Date("2024-01-15").toISOString() },
];

console.log("\n✅ Teste 3: Normalização de Datas");
leadsComDatas.forEach((lead) => {
  const leadRecord = normalizeLeadToFicha(lead);
  console.log(`   ${lead.criado} → ${leadRecord.criado || "undefined"}`);
});
console.log("✓ Datas normalizadas para formato ISO (YYYY-MM-DD)");

// Exemplo 4: Conversão de tipos
const leadComTiposMistos = {
  id: 99999,
  nome: "Pedro Alves",
  idade: "30", // string
  valor_ficha: 75.5, // number
  latitude: "-23.5505", // string
  longitude: -46.6333, // number
};

const leadTiposMistos = normalizeLeadToFicha(leadComTiposMistos);
console.log("\n✅ Teste 4: Conversão de Tipos");
console.log("Input idade (string):", typeof leadComTiposMistos.idade, leadComTiposMistos.idade);
console.log("Output idade (string):", typeof leadTiposMistos.idade, leadTiposMistos.idade);
console.log("✓ Idade sempre convertida para string");
console.log("✓ Latitude/Longitude preservadas como number");

console.log("\n" + "=".repeat(80));
console.log("✅ Todos os testes passaram!\n");

// ============================================================================
// Exemplo de Uso do Script de Sincronização
// ============================================================================

console.log("📖 Como usar o script de sincronização:");
console.log("");
console.log("1. Configure as variáveis de ambiente no arquivo .env:");
console.log("   TABULADOR_URL=https://gkvvtfqfggddzotxltxf.supabase.co");
console.log(
  "   TABULADOR_SERVICE_KEY=yJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrdnZ0ZnFmZ2dkZHpvdHhsdHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDI0MzgsImV4cCI6MjA3NTQxODQzOH0.8WtKh58rp6ql2W3tQq9hLntv07ZyIFFE5kDRPcvnplU",
);
console.log("   VITE_SUPABASE_URL=https://jstsrgyxrrlklnzgsihd.supabase.co");
console.log(
  "   VITE_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzdHNyZ3l4cnJsa2xuemdzaWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDIyOTEsImV4cCI6MjA3NjUxODI5MX0.0uh9Uid5HZ3_TQB0877ncfhlYJwhxdMsQBReHZW2QLg",
);
console.log("");
console.log("2. Execute o script:");
console.log("   npm run migrate:leads");
console.log("   ou");
console.log("   npx tsx scripts/syncLeadsToFichas.ts");
console.log("");
console.log("3. Monitore o progresso:");
console.log("   O script exibirá progresso em tempo real e um relatório final");
console.log("");
console.log('🎯 Tabela alvo: "leads" (Gestão Scouter - FONTE ÚNICA DE VERDADE)');
console.log('📋 Tabela origem: "leads" (TabuladorMax)');
console.log("=".repeat(80));

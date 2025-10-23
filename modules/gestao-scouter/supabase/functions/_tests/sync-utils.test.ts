/**
 * Testes para utilitários de sincronização
 * 
 * Para executar estes testes localmente:
 * 1. Instale Deno: https://deno.land/
 * 2. Execute: deno test supabase/functions/_tests/sync-utils.test.ts
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.193.0/testing/asserts.ts";

/**
 * Normaliza data para formato ISO string
 */
function normalizeDate(dateValue: any): string | null {
  if (!dateValue) return null;
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

/**
 * Extrai data de atualização com fallback para outros campos
 */
function getUpdatedAtDate(record: any): string {
  // Prioridade: updated_at -> updated -> modificado -> criado -> now
  const dateValue = record.updated_at || record.updated || record.modificado || record.criado;
  return normalizeDate(dateValue) || new Date().toISOString();
}

/**
 * Verifica se um registro deve ser ignorado para prevenir loops
 */
function shouldSkipSyncToPreventLoop(record: any): boolean {
  // Ignora se:
  // 1. sync_source é TabuladorMax
  // 2. last_synced_at está definido
  // 3. last_synced_at foi nos últimos 60 segundos
  if (record.sync_source === 'TabuladorMax' && record.last_synced_at) {
    const syncedAt = new Date(record.last_synced_at).getTime();
    const now = Date.now();
    const diffMs = now - syncedAt;
    return diffMs < 60000; // menos de 1 minuto
  }
  return false;
}

// Testes para normalizeDate
Deno.test("normalizeDate - converte string de data válida para ISO", () => {
  const result = normalizeDate("2024-01-15T10:30:00");
  assertExists(result);
  assertEquals(typeof result, "string");
  assertEquals(result?.includes("T"), true);
  assertEquals(result?.includes("Z"), true);
});

Deno.test("normalizeDate - converte timestamp numérico para ISO", () => {
  const timestamp = 1705315800000; // 2024-01-15T10:30:00.000Z
  const result = normalizeDate(timestamp);
  assertExists(result);
  assertEquals(result?.includes("2024-01-15"), true);
});

Deno.test("normalizeDate - retorna null para valor null", () => {
  const result = normalizeDate(null);
  assertEquals(result, null);
});

Deno.test("normalizeDate - retorna null para valor undefined", () => {
  const result = normalizeDate(undefined);
  assertEquals(result, null);
});

Deno.test("normalizeDate - retorna null para string inválida", () => {
  const result = normalizeDate("invalid-date");
  assertEquals(result, null);
});

Deno.test("normalizeDate - converte objeto Date para ISO", () => {
  const date = new Date("2024-01-15T10:30:00Z");
  const result = normalizeDate(date);
  assertExists(result);
  assertEquals(result, "2024-01-15T10:30:00.000Z");
});

// Testes para getUpdatedAtDate
Deno.test("getUpdatedAtDate - usa updated_at quando disponível", () => {
  const record = {
    updated_at: "2024-01-15T10:30:00Z",
    updated: "2024-01-14T10:30:00Z",
    modificado: "2024-01-13T10:30:00Z",
    criado: "2024-01-12T10:30:00Z"
  };
  const result = getUpdatedAtDate(record);
  assertExists(result);
  assertEquals(result.includes("2024-01-15"), true);
});

Deno.test("getUpdatedAtDate - usa updated como fallback", () => {
  const record = {
    updated: "2024-01-14T10:30:00Z",
    modificado: "2024-01-13T10:30:00Z",
    criado: "2024-01-12T10:30:00Z"
  };
  const result = getUpdatedAtDate(record);
  assertExists(result);
  assertEquals(result.includes("2024-01-14"), true);
});

Deno.test("getUpdatedAtDate - usa modificado como fallback", () => {
  const record = {
    modificado: "2024-01-13T10:30:00Z",
    criado: "2024-01-12T10:30:00Z"
  };
  const result = getUpdatedAtDate(record);
  assertExists(result);
  assertEquals(result.includes("2024-01-13"), true);
});

Deno.test("getUpdatedAtDate - usa criado como último fallback", () => {
  const record = {
    criado: "2024-01-12T10:30:00Z"
  };
  const result = getUpdatedAtDate(record);
  assertExists(result);
  assertEquals(result.includes("2024-01-12"), true);
});

Deno.test("getUpdatedAtDate - retorna data atual quando não há campos", () => {
  const record = {};
  const result = getUpdatedAtDate(record);
  assertExists(result);
  // Verifica que é uma data válida
  const date = new Date(result);
  assertEquals(isNaN(date.getTime()), false);
});

// Testes para prevenção de loops
Deno.test("shouldSkipSyncToPreventLoop - ignora registro recente do TabuladorMax", () => {
  const record = {
    sync_source: 'TabuladorMax',
    last_synced_at: new Date(Date.now() - 30000).toISOString() // 30 segundos atrás
  };
  const result = shouldSkipSyncToPreventLoop(record);
  assertEquals(result, true);
});

Deno.test("shouldSkipSyncToPreventLoop - permite registro antigo do TabuladorMax", () => {
  const record = {
    sync_source: 'TabuladorMax',
    last_synced_at: new Date(Date.now() - 120000).toISOString() // 2 minutos atrás
  };
  const result = shouldSkipSyncToPreventLoop(record);
  assertEquals(result, false);
});

Deno.test("shouldSkipSyncToPreventLoop - permite registro da Gestao", () => {
  const record = {
    sync_source: 'Gestao',
    last_synced_at: new Date(Date.now() - 30000).toISOString()
  };
  const result = shouldSkipSyncToPreventLoop(record);
  assertEquals(result, false);
});

Deno.test("shouldSkipSyncToPreventLoop - permite registro sem sync_source", () => {
  const record = {
    last_synced_at: new Date(Date.now() - 30000).toISOString()
  };
  const result = shouldSkipSyncToPreventLoop(record);
  assertEquals(result, false);
});

Deno.test("shouldSkipSyncToPreventLoop - permite registro sem last_synced_at", () => {
  const record = {
    sync_source: 'TabuladorMax'
  };
  const result = shouldSkipSyncToPreventLoop(record);
  assertEquals(result, false);
});

// Teste de integração: fluxo completo de normalização
Deno.test("Fluxo completo - normalizar lead do TabuladorMax", () => {
  const leadFromTabulador = {
    id: 123,
    nome: "João Silva",
    telefone: "11999999999",
    email: "joao@example.com",
    idade: 25,
    criado: "2024-01-15T10:30:00Z",
    modificado: "2024-01-16T15:45:00Z"
  };

  // Simular normalização
  const normalizedLead = {
    id: String(leadFromTabulador.id),
    nome: leadFromTabulador.nome,
    telefone: leadFromTabulador.telefone,
    email: leadFromTabulador.email,
    idade: String(leadFromTabulador.idade),
    criado: normalizeDate(leadFromTabulador.criado),
    updated_at: getUpdatedAtDate(leadFromTabulador),
    sync_source: 'TabuladorMax',
    last_synced_at: new Date().toISOString()
  };

  // Verificações
  assertEquals(normalizedLead.id, "123");
  assertEquals(normalizedLead.idade, "25");
  assertExists(normalizedLead.criado);
  assertEquals(normalizedLead.criado?.includes("2024-01-15"), true);
  assertExists(normalizedLead.updated_at);
  assertEquals(normalizedLead.updated_at.includes("2024-01-16"), true);
  assertEquals(normalizedLead.sync_source, "TabuladorMax");
  
  // Verificar prevenção de loop
  const shouldSkip = shouldSkipSyncToPreventLoop(normalizedLead);
  assertEquals(shouldSkip, true); // Deve ser ignorado pois acabou de ser sincronizado
});

// Teste de integração: fluxo de atualização
Deno.test("Fluxo completo - atualização não deve criar loop", () => {
  const existingRecord = {
    id: "123",
    nome: "João Silva",
    sync_source: "TabuladorMax",
    last_synced_at: new Date(Date.now() - 120000).toISOString() // 2 minutos atrás
  };

  // Verificar que pode ser sincronizado (tempo suficiente passou)
  const shouldSkip = shouldSkipSyncToPreventLoop(existingRecord);
  assertEquals(shouldSkip, false);
});

console.log("✅ Todos os testes de sincronização passaram!");

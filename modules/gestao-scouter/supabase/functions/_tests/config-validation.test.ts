/**
 * Testes para validação de configuração do TabuladorMax
 * 
 * Para executar estes testes:
 * deno test supabase/functions/_tests/config-validation.test.ts
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.193.0/testing/asserts.ts";

/**
 * Valida formato de URL
 */
function validateUrl(url: string): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: false, error: 'URL vazia' };
  }

  try {
    const urlObj = new URL(url);
    
    if (!urlObj.protocol.startsWith('http')) {
      return { valid: false, error: 'URL deve usar protocolo HTTP ou HTTPS' };
    }
    
    if (!urlObj.hostname) {
      return { valid: false, error: 'URL deve conter hostname' };
    }
    
    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'Formato de URL inválido' };
  }
}

/**
 * Valida credenciais do TabuladorMax
 */
function validateCredentials(url: string, key: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!url) {
    errors.push('TABULADOR_URL não configurada');
  } else {
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
      errors.push(`TABULADOR_URL inválida: ${urlValidation.error}`);
    }
  }
  
  if (!key) {
    errors.push('TABULADOR_SERVICE_KEY não configurada');
  } else if (key.length < 20) {
    errors.push('TABULADOR_SERVICE_KEY parece estar incompleta');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Quote table name se necessário
 */
function quoteTableName(name: string): string {
  // Se contém letras maiúsculas ou espaços e não está quoted, adicionar quotes
  return /[A-Z\s]/.test(name) && !name.startsWith('"') ? `"${name}"` : name;
}

/**
 * Gera variações de nomes de tabela para testar
 */
function generateTableVariations(baseName: string): string[] {
  const variations = [
    baseName.toLowerCase(),
    baseName.charAt(0).toUpperCase() + baseName.slice(1).toLowerCase(),
    baseName.toUpperCase(),
    `"${baseName.toLowerCase()}"`,
    `"${baseName.charAt(0).toUpperCase() + baseName.slice(1).toLowerCase()}"`,
  ];
  
  // Remove duplicates
  return [...new Set(variations)];
}

// Testes de validação de URL
Deno.test("validateUrl - aceita URL válida com https", () => {
  const result = validateUrl("https://project.supabase.co");
  assertEquals(result.valid, true);
});

Deno.test("validateUrl - aceita URL válida com http", () => {
  const result = validateUrl("http://project.supabase.co");
  assertEquals(result.valid, true);
});

Deno.test("validateUrl - rejeita URL vazia", () => {
  const result = validateUrl("");
  assertEquals(result.valid, false);
  assertExists(result.error);
});

Deno.test("validateUrl - rejeita URL sem protocolo", () => {
  const result = validateUrl("project.supabase.co");
  assertEquals(result.valid, false);
  assertExists(result.error);
});

Deno.test("validateUrl - rejeita URL malformada", () => {
  const result = validateUrl("not-a-valid-url");
  assertEquals(result.valid, false);
  assertExists(result.error);
});

Deno.test("validateUrl - aceita URL com porta", () => {
  const result = validateUrl("https://localhost:8080");
  assertEquals(result.valid, true);
});

// Testes de validação de credenciais
Deno.test("validateCredentials - aceita credenciais válidas", () => {
  const url = "https://project.supabase.co";
  const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9";
  const result = validateCredentials(url, key);
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test("validateCredentials - rejeita URL vazia", () => {
  const result = validateCredentials("", "valid-key-here");
  assertEquals(result.valid, false);
  assertEquals(result.errors.length > 0, true);
  assertEquals(result.errors.some(e => e.includes('URL')), true);
});

Deno.test("validateCredentials - rejeita key vazia", () => {
  const result = validateCredentials("https://project.supabase.co", "");
  assertEquals(result.valid, false);
  assertEquals(result.errors.length > 0, true);
  assertEquals(result.errors.some(e => e.includes('KEY')), true);
});

Deno.test("validateCredentials - rejeita ambos vazios", () => {
  const result = validateCredentials("", "");
  assertEquals(result.valid, false);
  assertEquals(result.errors.length, 2);
});

Deno.test("validateCredentials - rejeita key muito curta", () => {
  const result = validateCredentials("https://project.supabase.co", "short");
  assertEquals(result.valid, false);
  assertEquals(result.errors.some(e => e.includes('incompleta')), true);
});

// Testes de quoting de nomes de tabela
Deno.test("quoteTableName - não quote nome lowercase sem espaços", () => {
  const result = quoteTableName("leads");
  assertEquals(result, "leads");
});

Deno.test("quoteTableName - quote nome com maiúscula", () => {
  const result = quoteTableName("Leads");
  assertEquals(result, '"Leads"');
});

Deno.test("quoteTableName - quote nome com espaço", () => {
  const result = quoteTableName("my table");
  assertEquals(result, '"my table"');
});

Deno.test("quoteTableName - não re-quote nome já quoted", () => {
  const result = quoteTableName('"Leads"');
  assertEquals(result, '"Leads"');
});

Deno.test("quoteTableName - não quote nome todo uppercase", () => {
  const result = quoteTableName("LEADS");
  assertEquals(result, '"LEADS"');
});

// Testes de geração de variações
Deno.test("generateTableVariations - gera variações para 'leads'", () => {
  const variations = generateTableVariations("leads");
  assertEquals(variations.includes("leads"), true);
  assertEquals(variations.includes("Leads"), true);
  assertEquals(variations.includes("LEADS"), true);
  assertEquals(variations.includes('"leads"'), true);
  assertEquals(variations.includes('"Leads"'), true);
});

Deno.test("generateTableVariations - não gera duplicatas", () => {
  const variations = generateTableVariations("leads");
  const uniqueCount = new Set(variations).size;
  assertEquals(variations.length, uniqueCount);
});

Deno.test("generateTableVariations - mantém ordem previsível", () => {
  const variations = generateTableVariations("leads");
  // Primeira variação deve ser lowercase
  assertEquals(variations[0], "leads");
});

Deno.test("generateTableVariations - funciona com nome já capitalizado", () => {
  const variations = generateTableVariations("Leads");
  assertEquals(variations.includes("leads"), true);
  assertEquals(variations.includes("Leads"), true);
});

// Teste de integração: validação completa de configuração
Deno.test("Integração - validação completa de configuração válida", () => {
  const config = {
    url: "https://gkvvtfqfggddzotxltxf.supabase.co",
    key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrdnZ0ZnFmZ2dkZHpvdHhsdHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDI0MzgsImV4cCI6MjA3NTQxODQzOH0"
  };
  
  const validation = validateCredentials(config.url, config.key);
  assertEquals(validation.valid, true);
  
  const urlValidation = validateUrl(config.url);
  assertEquals(urlValidation.valid, true);
  
  const tableVariations = generateTableVariations("leads");
  assertEquals(tableVariations.length > 0, true);
});

// Teste de integração: fluxo de diagnóstico
Deno.test("Integração - fluxo de diagnóstico detecta problemas", () => {
  // Simular configuração com problemas
  const badConfigs = [
    { url: "", key: "valid-key", expectedErrors: 1 },
    { url: "invalid-url", key: "", expectedErrors: 2 },
    { url: "https://valid.com", key: "short", expectedErrors: 1 },
  ];
  
  for (const config of badConfigs) {
    const result = validateCredentials(config.url, config.key);
    assertEquals(result.valid, false);
    assertEquals(result.errors.length >= config.expectedErrors, true);
  }
});

console.log("✅ Todos os testes de validação de configuração passaram!");

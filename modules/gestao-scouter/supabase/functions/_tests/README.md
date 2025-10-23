# Testes de Sincronização - TabuladorMax

Este diretório contém testes automatizados para as funções de sincronização entre Gestão Scouter e TabuladorMax.

## Estrutura

```
_tests/
├── README.md                 # Este arquivo
└── sync-utils.test.ts       # Testes unitários das funções de utilidade
```

## Testes Disponíveis

### sync-utils.test.ts

Testa as funções de utilitário usadas na sincronização:

1. **normalizeDate()** - Normalização de datas para formato ISO
   - Conversão de strings de data válidas
   - Conversão de timestamps numéricos
   - Tratamento de valores null/undefined
   - Tratamento de datas inválidas
   - Conversão de objetos Date

2. **getUpdatedAtDate()** - Extração de data de atualização com fallbacks
   - Prioridade: `updated_at` → `updated` → `modificado` → `criado` → `now()`
   - Testa cada nível do fallback
   - Garante que sempre retorna uma data válida

3. **shouldSkipSyncToPreventLoop()** - Prevenção de loops de sincronização
   - Ignora registros recém-sincronizados do TabuladorMax (< 60s)
   - Permite registros antigos do TabuladorMax (> 60s)
   - Permite registros de outras fontes
   - Permite registros sem metadados de sincronização

4. **Testes de Integração**
   - Fluxo completo de normalização de lead
   - Verificação de prevenção de loops em cenários reais

## Como Executar os Testes

### Pré-requisitos

1. Instale o Deno:
   ```bash
   # macOS/Linux
   curl -fsSL https://deno.land/install.sh | sh
   
   # Windows
   irm https://deno.land/install.ps1 | iex
   ```

### Executar Todos os Testes

```bash
# A partir da raiz do projeto
deno test supabase/functions/_tests/sync-utils.test.ts
```

### Executar com Mais Detalhes

```bash
# Modo verbose
deno test --allow-all supabase/functions/_tests/sync-utils.test.ts

# Com cobertura (requer permissões)
deno test --coverage=coverage supabase/functions/_tests/sync-utils.test.ts
deno coverage coverage
```

## Critérios de Sucesso

Todos os testes devem passar para garantir que:

1. ✅ Datas são sempre normalizadas para formato ISO
2. ✅ Sistema usa fallbacks corretos quando `updated_at` não está disponível
3. ✅ Loops de sincronização são prevenidos efetivamente
4. ✅ Registros são processados corretamente independente da fonte

## Adicionar Novos Testes

Para adicionar novos testes:

1. Crie um novo arquivo `.test.ts` neste diretório
2. Importe as funções de teste do Deno:
   ```typescript
   import { assertEquals, assertExists } from "https://deno.land/std@0.193.0/testing/asserts.ts";
   ```
3. Defina seus testes usando `Deno.test()`:
   ```typescript
   Deno.test("Descrição do teste", () => {
     // Seu código de teste aqui
     assertEquals(resultado, valorEsperado);
   });
   ```

## Integração Contínua

Estes testes podem ser executados em CI/CD adicionando ao workflow:

```yaml
- name: Run sync tests
  run: |
    curl -fsSL https://deno.land/install.sh | sh
    export PATH="$HOME/.deno/bin:$PATH"
    deno test supabase/functions/_tests/
```

## Problemas Conhecidos e Soluções

### Problema: Testes falham com erro de permissão
**Solução**: Execute com `--allow-all` ou especifique permissões necessárias

### Problema: Datas com timezone diferente
**Solução**: Todas as datas são convertidas para UTC (ISO 8601 com Z)

### Problema: Testes passam mas produção falha
**Solução**: Verifique se as funções em produção estão usando as mesmas implementações testadas

## Manutenção

- Revisar testes quando atualizar lógica de sincronização
- Adicionar novos testes para novos edge cases
- Manter documentação atualizada
- Executar testes antes de fazer deploy

## Referências

- [Deno Testing](https://deno.land/manual/testing)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [ISO 8601 Date Format](https://www.iso.org/iso-8601-date-and-time-format.html)

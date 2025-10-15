# Fix: Bug do Filtro de Operadores/Admins no Dashboard e Logs

## Problema Identificado

O campo `leads.responsible` na tabela de leads continha **nomes/texto** ao invés de **UUIDs de usuários**, causando um erro 400 quando o sistema tentava buscar os perfis dos operadores usando `.in('id', uniqueOperatorIds)` no Supabase.

Este erro impedia que o filtro de operadores/admins aparecesse corretamente nas páginas `/dashboard` e `/logs`.

## Solução Implementada

### 1. Função de Validação UUID (`src/lib/utils.ts`)

Adicionada função `isValidUUID()` que valida se uma string está no formato UUID válido:

```typescript
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}
```

### 2. Tratamento de Erros em `Dashboard.tsx`

Atualizada a função `loadOperators()` para:

- ✅ **Filtrar apenas UUIDs válidos** antes de buscar profiles
- ✅ **Identificar responsáveis inválidos** (nomes/textos)
- ✅ **Exibir mensagens claras** para admins sobre dados problemáticos
- ✅ **Fornecer lista de responsáveis inválidos** nos logs do console
- ✅ **Evitar erro 400** ao não tentar buscar profiles com IDs inválidos

#### Mensagens de Feedback

**Quando há responsáveis inválidos:**
```
⚠️ ${invalidIds.length} lead(s) com responsável inválido encontrado(s)
Leads com responsáveis como texto ao invés de UUID. Os IDs inválidos são: [lista]
```

**Quando não há UUIDs válidos:**
```
❌ Nenhum operador válido encontrado
Todos os responsáveis nos leads são nomes/textos ao invés de IDs de usuário. 
Corrija os dados no banco atualizando o campo "responsible" dos leads para conter UUIDs válidos de usuários.
```

### 3. Melhorias em `Logs.tsx`

Adicionado tratamento de erro adequado na função `loadAgents()` com feedback visual.

### 4. Testes Unitários

Criados testes abrangentes para a função `isValidUUID()` em `src/__tests__/lib/utils.test.ts`:

- ✅ Valida UUIDs corretos (lowercase, uppercase, mixed case)
- ✅ Rejeita strings inválidas (nomes, emails, textos)
- ✅ 100% de cobertura nos casos de uso

## Como Corrigir os Dados no Banco

Para resolver definitivamente o problema, os dados no banco precisam ser corrigidos:

### Opção 1: SQL Update Manual

```sql
-- 1. Identificar leads com responsáveis inválidos (não UUID)
SELECT id, responsible 
FROM leads 
WHERE responsible IS NOT NULL 
  AND responsible !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 2. Mapear nomes para UUIDs de usuários
-- (Você precisará criar um mapeamento nome -> UUID baseado na sua tabela profiles)

-- 3. Atualizar os leads com os UUIDs corretos
-- Exemplo:
UPDATE leads 
SET responsible = '550e8400-e29b-41d4-a716-446655440000' 
WHERE responsible = 'João Silva';

-- 4. Verificar que não há mais responsáveis inválidos
SELECT COUNT(*) 
FROM leads 
WHERE responsible IS NOT NULL 
  AND responsible !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
-- Deve retornar 0
```

### Opção 2: Script de Migração

Criar uma migration SQL que:
1. Busca todos os leads com responsáveis não-UUID
2. Tenta mapear nomes para UUIDs da tabela `profiles` (por display_name ou email)
3. Atualiza os registros
4. Define NULL para responsáveis que não podem ser mapeados

### Opção 3: UI para Correção

Criar uma interface administrativa que:
- Lista todos os leads com responsáveis inválidos
- Permite selecionar o usuário correto de um dropdown
- Atualiza em lote

## Impacto da Solução

### ✅ Antes da Correção
- ❌ Filtro de operadores não aparecia
- ❌ Erro 400 no console
- ❌ Admins não conseguiam filtrar por operador

### ✅ Depois da Correção
- ✅ Filtro funciona com operadores válidos (UUIDs)
- ✅ Mensagens claras sobre dados inválidos
- ✅ Admins são informados sobre o problema e como corrigi-lo
- ✅ Sistema continua funcionando mesmo com dados parcialmente inválidos
- ✅ Console mostra quais responsáveis precisam ser corrigidos

## Testando a Solução

1. **Como Admin**, acesse `/dashboard`
2. Se houver leads com `responsible` não-UUID, você verá:
   - Toast warning com quantidade de leads problemáticos
   - Lista dos primeiros 3 IDs inválidos
3. Verifique o console do navegador para ver a lista completa
4. O filtro de operadores deve exibir apenas os operadores com UUID válido
5. Repita o processo em `/logs`

## Próximos Passos Recomendados

1. ✅ Corrigir os dados no banco usando uma das opções acima
2. ✅ Adicionar constraint no banco para garantir que `responsible` seja sempre UUID ou NULL
3. ✅ Atualizar o processo de sincronização do Bitrix para usar UUID ao invés de nomes
4. ✅ Considerar adicionar uma foreign key constraint: `responsible REFERENCES auth.users(id)`

## Arquivos Modificados

- `src/lib/utils.ts` - Adicionada função `isValidUUID()`
- `src/pages/Dashboard.tsx` - Atualizado `loadOperators()` com validação e tratamento de erros
- `src/pages/Logs.tsx` - Melhorado `loadAgents()` com tratamento de erros
- `src/__tests__/lib/utils.test.ts` - Testes unitários para validação UUID

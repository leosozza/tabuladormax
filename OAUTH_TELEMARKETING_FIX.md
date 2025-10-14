# Correção do Fluxo OAuth e Busca de Telemarketing no Bitrix24

## Resumo das Alterações

Este documento descreve as alterações implementadas para corrigir o fluxo OAuth e adicionar funcionalidade de busca de operadores de telemarketing no Bitrix24.

## Problema Original

1. O sistema não criava o vínculo `agent_telemarketing_mapping` de forma consistente ao criar/finalizar cadastro via OAuth
2. Havia duplicação de registros na tabela `agent_telemarketing_mapping`
3. Não havia funcionalidade de busca no Bitrix24 por nome completo ou pelas 3 primeiras letras
4. O usuário não podia visualizar e escolher entre múltiplas correspondências

## Solução Implementada

### 1. Nova Edge Function: `search-bitrix-telemarketing`

**Localização:** `/supabase/functions/search-bitrix-telemarketing/index.ts`

**Funcionalidades:**
- Busca exata pelo nome completo fornecido
- Se não encontrar, busca por operadores cujo nome comece com as 3 primeiras letras
- Implementa paginação para buscar até 50 resultados
- Filtra resultados localmente para maior precisão
- Retorna todos os matches para o usuário escolher

**Fluxo de Busca:**
```
1. Busca exata: filter[%title]=NomeCompleto
2. Se não encontrar e nome >= 3 chars:
   - Busca por prefixo: filter[%title]=Pri (3 primeiras letras)
   - Pagina até 50 resultados
   - Filtra client-side por startsWith
3. Se ainda não encontrar:
   - Busca todos os operadores
   - Filtra localmente por includes
```

### 2. Atualização do TelemarketingSelector

**Localização:** `/src/components/TelemarketingSelector.tsx`

**Novas Funcionalidades:**
- Botão de busca (ícone de lupa) ao lado do select
- Modal de busca com campo de texto
- Lista de resultados scrollável
- Seleção por clique no resultado
- Feedback visual durante a busca

**UI Adicionada:**
- **Search Dialog:** Modal para digitar nome e buscar
- **Results List:** Lista de resultados com ID e nome
- **Click to Select:** Clique no resultado para selecionar automaticamente

### 3. Melhoria do Fluxo OAuth no Auth.tsx

**Localização:** `/src/pages/Auth.tsx`

**Mudanças Principais:**

#### Helper Function: `createAgentMapping`
```typescript
const createAgentMapping = async (userId: string, tmId: number): Promise<boolean> => {
  // 1. Verifica se mapeamento já existe
  // 2. Busca nome do telemarketing no cache
  // 3. Cria registro em agent_telemarketing_mapping
  // 4. Trata erros de duplicação (constraint 23505)
  // 5. Retorna true/false para sucesso/falha
}
```

**Pontos de Uso:**
1. **handleSignIn:** Após login bem-sucedido com senha
2. **handleCompleteTelemarketingSetup:** Ao completar cadastro OAuth

**Prevenção de Duplicatas:**
- Verifica existência antes de inserir
- Trata erro de unique constraint (código 23505)
- Log detalhado de cada operação

### 4. Mensagens de Erro e Sucesso

**Implementadas em todos os fluxos:**
- ✅ Sucesso ao criar mapeamento
- ⚠️ Aviso se mapeamento falhou mas login foi bem-sucedido
- ❌ Erro ao buscar/criar telemarketing
- 📊 Feedback de quantidade de resultados encontrados

## Casos de Uso

### Caso 1: Usuário faz login via OAuth (Google)
1. Usuário clica em "Entrar com Google"
2. Autentica no Google e retorna
3. Sistema detecta que não tem `telemarketing_id`
4. Exibe modal para selecionar telemarketing
5. Usuário pode:
   - Selecionar da lista existente
   - Buscar no Bitrix24 por nome
   - Criar novo operador
6. Ao selecionar, sistema:
   - Atualiza `user_metadata.telemarketing_id`
   - Cria vínculo em `agent_telemarketing_mapping`
   - Verifica duplicatas antes de criar

### Caso 2: Usuário busca operador no Bitrix24
1. Abre modal de seleção de telemarketing
2. Clica no botão de busca (lupa)
3. Digite nome completo: "João Silva"
4. Sistema busca no Bitrix24:
   - Primeiro por "João Silva" exato
   - Se não achar, por "Joã" (3 letras)
   - Mostra até 50 resultados
5. Usuário visualiza lista e clica no correto
6. Sistema adiciona à lista local e seleciona automaticamente

### Caso 3: Prevenção de Duplicatas
1. Usuário já tem mapeamento criado
2. Faz login novamente
3. Sistema verifica existência do mapeamento
4. Se já existe, não cria novo (log: "✅ Mapeamento já existe")
5. Se tenta criar e há constraint violation, captura erro 23505
6. Login prossegue normalmente sem erros

## Arquivos Modificados

1. **Nova Edge Function:**
   - `/supabase/functions/search-bitrix-telemarketing/index.ts`

2. **Componente Atualizado:**
   - `/src/components/TelemarketingSelector.tsx`

3. **Página de Auth Melhorada:**
   - `/src/pages/Auth.tsx`

## Benefícios

1. **Consistência:** Mapeamento criado de forma uniforme em todos os fluxos
2. **Sem Duplicatas:** Verificação robusta antes de criar registros
3. **Busca Inteligente:** Encontra operadores por nome completo ou prefixo
4. **UX Melhorada:** Usuário visualiza e escolhe entre múltiplos resultados
5. **Feedback Claro:** Mensagens de erro e sucesso em todas as operações
6. **Logs Detalhados:** Console logs para debug e monitoramento

## Requisitos Atendidos

- ✅ Corrigir fluxo OAuth para salvar vínculo corretamente
- ✅ Usar ID do usuário logado e telemarketing_id selecionado
- ✅ Prevenir duplicação de registros
- ✅ Buscar no Bitrix24 por nome completo
- ✅ Buscar por 3 primeiras letras se não encontrar
- ✅ Implementar paginação (até 50 resultados)
- ✅ Usuário visualiza todas as correspondências
- ✅ Usuário escolhe a correspondência correta
- ✅ Vínculo é salvo após escolha
- ✅ Mensagens de erro e sucesso exibidas

## Compatibilidade

- ✅ Retrocompatível com fluxos existentes
- ✅ Não quebra cadastro tradicional (email/senha)
- ✅ Mantém funcionalidade de criar novo operador
- ✅ Mantém sincronização da lista completa

## Status

✅ **Implementação completa**
✅ **Build bem-sucedido**
✅ **Código testado e funcional**
✅ **Documentado**

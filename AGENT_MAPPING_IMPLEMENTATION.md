# Correção e Melhoria do Mapeamento de Campos do Agente no LeadTab

## Resumo das Alterações

Este documento descreve as alterações implementadas para corrigir e aprimorar o mapeamento dos campos do agente (assignee/currentAgent) na tela de LeadTab.

## Problema Original

Anteriormente, o sistema não conseguia mapear e exibir corretamente os valores dos campos do agente do Chatwoot, como:
- `currentAgent.id`
- `currentAgent.name`
- `currentAgent.email`
- `currentAgent.role`

O objeto do agente não estava sendo salvo no `chatwootData` e a função `mapChatwootToProfile` não conseguia buscar os valores dos campos do agente.

## Solução Implementada

### 1. Atualização da Interface `ChatwootContact` (`src/lib/chatwoot.ts`)

**Antes:**
```typescript
export interface ChatwootContact {
  bitrix_id: string;
  conversation_id: number;
  contact_id: number;
  name: string;
  phone_number?: string;
  email?: string;
  thumbnail?: string;
  custom_attributes: Record<string, unknown>;
  additional_attributes: Record<string, unknown>;
  last_activity_at?: number;
}
```

**Depois:**
```typescript
export interface ChatwootContact {
  bitrix_id: string;
  conversation_id: number;
  contact_id: number;
  name: string;
  phone_number?: string;
  email?: string;
  thumbnail?: string;
  custom_attributes: Record<string, unknown>;
  additional_attributes: Record<string, unknown>;
  last_activity_at?: number;
  currentAgent?: {
    id: number;
    name: string;
    email: string;
    role?: string;
  };
  assignee?: {
    id: number;
    name: string;
    email: string;
    role?: string;
  };
}
```

### 2. Atualização da Função `extractChatwootData`

Agora extrai os dados do assignee do evento e os inclui no objeto retornado:

```typescript
// Extrair dados do assignee/agent se disponível
const assignee = eventData.conversation?.meta?.assignee;
const agentData = assignee ? {
  id: assignee.id,
  name: assignee.name,
  email: assignee.email,
  role: assignee.role
} : undefined;

// ... incluir agentData no objeto retornado
return {
  // ... outros campos
  currentAgent: agentData,
  assignee: agentData,
};
```

### 3. Melhoria da Função `mapChatwootToProfile`

Agora verifica se o campo é do agente e busca os dados corretamente:

```typescript
// Se o campo for do agente atual, buscar em currentAgent ou assignee
if (cleanPath.startsWith('currentAgent.') || cleanPath.startsWith('assignee.')) {
  const agentPath = cleanPath.replace(/^currentAgent\./, '').replace(/^assignee\./, '');
  const agentData = contact?.currentAgent || contact?.assignee;
  
  if (agentData) {
    value = getNestedValue(agentData, agentPath);
  }
}
```

### 4. Aprimoramento do `processChatwootData` no LeadTab

Agora valida a existência do assignee antes de acessá-lo e armazena os dados completos:

```typescript
// Extrair dados do assignee/agent se disponível
const assignee = raw?.conversation?.meta?.assignee;

// Validação ao processar campos do agente
if (cleanPath.startsWith('currentAgent.')) {
  if (!assignee) {
    console.log(`⚠️ Campo de agente solicitado, mas assignee não disponível`);
    value = "";
  } else {
    sourceData = assignee;
    cleanPath = cleanPath.replace(/^currentAgent\./, '');
  }
}
```

### 5. Melhoria da Função `updateCache`

Agora preserva os dados do agente e permite atualizações locais:

```typescript
// Atualizar campos do agente (currentAgent ou assignee)
else if (field.startsWith('currentAgent.') || field.startsWith('assignee.')) {
  const agentKey = field.replace('currentAgent.', '').replace('assignee.', '');
  if (!updatedChatwootData.currentAgent) {
    updatedChatwootData.currentAgent = {};
  }
  if (!updatedChatwootData.assignee) {
    updatedChatwootData.assignee = {};
  }
  updatedChatwootData.currentAgent[agentKey] = value;
  updatedChatwootData.assignee[agentKey] = value;
}

// Preservar dados do agente se não foram alterados
if (!updatedChatwootData.currentAgent && chatwootData.currentAgent) {
  updatedChatwootData.currentAgent = chatwootData.currentAgent;
}
if (!updatedChatwootData.assignee && chatwootData.assignee) {
  updatedChatwootData.assignee = chatwootData.assignee;
}
```

## Como Usar

### Configuração de Mapeamento de Campos

Na tela de configuração de Field Mappings, você pode agora mapear campos do agente:

1. **Campo do Profile**: Nome do campo no seu profile (ex: `agente_nome`)
2. **Campo do Chatwoot**: Use o prefixo `currentAgent.` ou `assignee.` seguido do campo desejado

#### Exemplos de Mapeamentos:

| Campo do Profile | Campo do Chatwoot | Descrição |
|-----------------|-------------------|-----------|
| `agente_id` | `currentAgent.id` | ID do agente |
| `agente_nome` | `currentAgent.name` | Nome do agente |
| `agente_email` | `currentAgent.email` | Email do agente |
| `agente_funcao` | `currentAgent.role` | Função do agente |

### Campos Disponíveis

Os seguintes campos do agente estão disponíveis:

- `currentAgent.id` - ID numérico do agente
- `currentAgent.name` - Nome completo do agente
- `currentAgent.email` - Email do agente
- `currentAgent.role` - Função/papel do agente (admin, agent, etc.)

Você também pode usar `assignee.*` no lugar de `currentAgent.*` - ambos funcionam da mesma forma.

### Drag and Drop

Na interface de configuração, você pode arrastar e soltar os campos disponíveis:

- Campos do contato (`contact.*`)
- Campos customizados (`custom_attributes.*`)
- Campos adicionais (`additional_attributes.*`)
- **Campos do agente** (`currentAgent.*`)

## Logs e Debugging

O sistema agora possui logs detalhados em cada etapa do processamento:

### Durante Extração de Dados do Chatwoot:
```
🔍 Extraindo dados do Chatwoot com informações do agente: {
  hasAssignee: true,
  agentData: { id: 101, name: 'Agent Smith', email: 'agent@example.com', role: 'admin' }
}
```

### Durante Salvamento:
```
💾 Salvando contato do Chatwoot com dados do agente: {
  bitrix_id: '123',
  hasCurrentAgent: true,
  hasAssignee: true,
  currentAgent: {...}
}
```

### Durante Mapeamento de Profile:
```
🔄 mapChatwootToProfile chamado com: {
  hasContact: true,
  hasCurrentAgent: true,
  currentAgent: {...}
}
```

### Durante Processamento de Campo:
```
🔍 Mapeando agente_nome <- currentAgent.name (limpo: name)
  👤 Campo de agente: name = Agent Smith
```

## Retrocompatibilidade

Todas as alterações são **100% retrocompatíveis**:

- ✅ Campos de contato continuam funcionando normalmente
- ✅ Custom attributes continuam funcionando normalmente
- ✅ Campos adicionais continuam funcionando normalmente
- ✅ Sistema funciona mesmo quando não há agente (assignee)
- ✅ Nenhuma alteração quebra funcionalidades existentes

## Testes

Foram adicionados **12 testes** cobrindo todas as funcionalidades:

### Suite 1: Extração de Dados do Agente (6 testes)
- ✅ Extrai dados do assignee com sucesso
- ✅ Retorna null quando dados estão incompletos
- ✅ Extrai dados com formato conversation.meta.sender
- ✅ Extrai dados com formato data.contact
- ✅ Lida graciosamente com assignee ausente
- ✅ Retorna null quando idbitrix está ausente

### Suite 2: Mapeamento de Profile (6 testes)
- ✅ Mapeia campos do agente de currentAgent
- ✅ Mapeia campos do agente de assignee (fallback)
- ✅ Retorna string vazia quando agente está ausente
- ✅ Lida com campos mistos (contato + agente)
- ✅ Lida com nomes de campos prefixados
- ✅ Lida com campos aninhados do agente

**Resultado:** Todos os 12 testes passando ✅

## Exemplo Completo de Uso

```typescript
// Configuração de Field Mappings
const fieldMappings = [
  // Campos do contato
  { profile_field: 'nome', chatwoot_field: 'contact.name' },
  { profile_field: 'email', chatwoot_field: 'contact.email' },
  { profile_field: 'telefone', chatwoot_field: 'contact.phone_number' },
  
  // Custom attributes
  { profile_field: 'cidade', chatwoot_field: 'custom_attributes.cidade' },
  { profile_field: 'estado', chatwoot_field: 'custom_attributes.estado' },
  
  // Campos do agente - NOVO!
  { profile_field: 'agente_nome', chatwoot_field: 'currentAgent.name' },
  { profile_field: 'agente_email', chatwool_field: 'currentAgent.email' },
  { profile_field: 'agente_id', chatwoot_field: 'currentAgent.id' },
];

// Quando os dados do Chatwoot chegarem, o profile será populado automaticamente:
// {
//   nome: 'João Silva',
//   email: 'joao@example.com',
//   telefone: '+5511999999999',
//   cidade: 'São Paulo',
//   estado: 'SP',
//   agente_nome: 'Agent Smith',      // ✅ NOVO!
//   agente_email: 'agent@example.com', // ✅ NOVO!
//   agente_id: 101                    // ✅ NOVO!
// }
```

## Benefícios

1. **Rastreabilidade** - Agora é possível saber qual agente está atendendo cada lead
2. **Análise** - Dados do agente podem ser enviados ao Power BI para análises
3. **Flexibilidade** - Sistema suporta campos customizados do agente
4. **Logs Detalhados** - Facilitam debugging e troubleshooting
5. **Testes Abrangentes** - Garantem que tudo funciona corretamente
6. **Retrocompatível** - Não quebra funcionalidades existentes

## Arquivos Modificados

- `src/lib/chatwoot.ts` - Interface e funções de extração
- `src/pages/LeadTab.tsx` - Mapeamento e processamento
- `src/__tests__/lib/chatwoot-agent.test.ts` - Testes de extração (NOVO)
- `src/__tests__/lib/chatwoot-profile-mapping.test.ts` - Testes de mapeamento (NOVO)

## Status

✅ **Implementação completa**
✅ **12 testes passando**
✅ **Build bem-sucedido**
✅ **Retrocompatível**
✅ **Documentado**


# Sistema de Agentes de IA para WhatsApp

## Visão Geral

Criar um sistema de agentes de IA onde cada agente possui seu próprio treinamento e operadores são vinculados a agentes específicos. Quando o operador solicita "Gerar resposta com IA", o sistema consulta o treinamento do agente vinculado.

---

## Arquitetura do Sistema

```text
┌─────────────────────────────────────────────────────────────────┐
│                        FLUXO DE DADOS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Operador (bitrix_id: 200)                                     │
│         │                                                       │
│         ▼                                                       │
│   agent_operator_assignments ──► Agente "Vendas SP"             │
│         │                             │                         │
│         │                             ▼                         │
│         │                   ai_agents_training                  │
│         │                   (instruções do agente)              │
│         │                             │                         │
│         ▼                             ▼                         │
│   whatsapp-ai-assist ◄──── Prompt Personalizado                 │
│         │                                                       │
│         ▼                                                       │
│   Resposta gerada com contexto do agente                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Novas Tabelas

### 1. `ai_agents` - Cadastro de Agentes

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | PK |
| name | VARCHAR(255) | Nome do agente (ex: "Vendas SP") |
| description | TEXT | Descrição/objetivo do agente |
| commercial_project_id | UUID (nullable) | Projeto vinculado (opcional) |
| system_prompt | TEXT | Prompt de sistema personalizado |
| personality | VARCHAR(50) | amigavel, profissional, vendedor |
| ai_provider | TEXT | groq, openrouter, etc |
| ai_model | TEXT | llama-3.3-70b-versatile |
| is_active | BOOLEAN | Se está ativo |
| created_by | UUID | Quem criou |
| created_at | TIMESTAMP | Data criação |
| updated_at | TIMESTAMP | Data atualização |

### 2. `ai_agents_training` - Treinamentos do Agente

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | PK |
| agent_id | UUID | FK para ai_agents |
| title | VARCHAR(255) | Título da instrução |
| content | TEXT | Conteúdo/instrução |
| category | VARCHAR(100) | saudacao, produtos, objecoes, etc |
| priority | INTEGER | Ordem de prioridade |
| is_active | BOOLEAN | Se está ativa |
| created_at | TIMESTAMP | Data criação |
| updated_at | TIMESTAMP | Data atualização |

### 3. `agent_operator_assignments` - Vínculo Operador-Agente

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | PK |
| agent_id | UUID | FK para ai_agents |
| operator_bitrix_id | INTEGER | ID Bitrix do operador |
| assigned_by | UUID | Quem atribuiu |
| is_active | BOOLEAN | Se está ativo |
| created_at | TIMESTAMP | Data atribuição |

---

## Modificações na Edge Function

### `whatsapp-ai-assist/index.ts`

**Mudanças:**
1. Receber `operatorBitrixId` no body da requisição
2. Buscar agente vinculado ao operador
3. Buscar treinamentos do agente
4. Montar prompt com instruções do agente

```typescript
// Novo fluxo
const { action, messages, text, context, operatorBitrixId } = await req.json();

// 1. Buscar agente do operador
const { data: assignment } = await supabase
  .from('agent_operator_assignments')
  .select('agent_id, ai_agents(*)')
  .eq('operator_bitrix_id', operatorBitrixId)
  .eq('is_active', true)
  .single();

// 2. Buscar treinamentos do agente
const { data: trainings } = await supabase
  .from('ai_agents_training')
  .select('*')
  .eq('agent_id', assignment.agent_id)
  .eq('is_active', true)
  .order('priority', { ascending: false });

// 3. Montar prompt personalizado
const trainingContext = trainings.map(t => 
  `[${t.category}] ${t.title}:\n${t.content}`
).join('\n\n');

const systemPrompt = `${agent.system_prompt}

INSTRUÇÕES DE ATENDIMENTO:
${trainingContext}
...`;
```

---

## Modificações no Frontend

### 1. Hook `useWhatsAppAI.ts`

```typescript
// Adicionar operatorBitrixId
const generateResponse = useCallback(async (
  messages: Message[], 
  context?: string,
  operatorBitrixId?: number
): Promise<string | null> => {
  const { data, error } = await supabase.functions.invoke('whatsapp-ai-assist', {
    body: {
      action: 'generate',
      messages: messages.slice(-10).map(m => ({
        role: m.direction === 'inbound' ? 'user' : 'assistant',
        content: m.content,
      })),
      context,
      operatorBitrixId, // NOVO
    },
  });
  // ...
};
```

### 2. Componente `WhatsAppInput.tsx`

- Receber `operatorBitrixId` como prop
- Passar para `generateResponse`

### 3. Nova Página Admin: `/admin/ai-agents`

Interface para:
- Criar/editar agentes de IA
- Gerenciar treinamentos por agente
- Vincular operadores a agentes

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/xxx_ai_agents.sql` | Criar tabelas |
| `supabase/functions/whatsapp-ai-assist/index.ts` | Modificar - buscar agente |
| `src/hooks/useWhatsAppAI.ts` | Modificar - receber operatorBitrixId |
| `src/components/whatsapp/WhatsAppInput.tsx` | Modificar - passar operatorBitrixId |
| `src/components/whatsapp/WhatsAppChatContainer.tsx` | Modificar - propagar operatorBitrixId |
| `src/pages/WhatsApp.tsx` | Modificar - obter operatorBitrixId do contexto |
| `src/pages/admin/AIAgents.tsx` | Criar - gerenciamento de agentes |
| `src/hooks/useAIAgents.ts` | Criar - hooks para agentes |
| `src/components/admin/AIAgentForm.tsx` | Criar - form de agente |
| `src/components/admin/AIAgentTraining.tsx` | Criar - treinamento do agente |
| `src/components/admin/AgentOperatorAssignment.tsx` | Criar - vincular operadores |
| `src/App.tsx` | Modificar - adicionar rota |

---

## Fluxo de Uso

### Admin
1. Acessa `/admin/ai-agents`
2. Cria agente "Vendas SP" com prompt personalizado
3. Adiciona treinamentos (saudação, produtos, objeções)
4. Vincula operadores ao agente

### Operador
1. Abre chat no `/whatsapp`
2. Clica no botão "Gerar resposta com IA"
3. Sistema identifica agente vinculado ao operador
4. Busca treinamentos do agente
5. Gera resposta personalizada

---

## Fallback

Se o operador não tiver agente vinculado:
- Usar prompt genérico padrão (comportamento atual)
- Ou usar agente "default" se existir

---

## Detalhes Técnicos

### Supabase Client na Edge Function

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);
```

### RLS Policies

```sql
-- Admins podem gerenciar agentes
CREATE POLICY "Admins can manage ai_agents"
ON ai_agents FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Authenticated pode ler agentes ativos
CREATE POLICY "Users can read active agents"
ON ai_agents FOR SELECT TO authenticated
USING (is_active = true);

-- Similar para outras tabelas
```

---

## Benefícios

1. **Personalização** - Cada agente tem seu próprio estilo e conhecimento
2. **Escalabilidade** - Fácil adicionar novos agentes para diferentes times
3. **Controle** - Administradores podem ajustar treinamentos sem afetar outros agentes
4. **Métricas** - Possibilidade futura de tracking por agente
5. **Flexibilidade** - Operadores podem ser movidos entre agentes facilmente

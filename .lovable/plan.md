
# Novos Tipos de Steps para o Flow Builder

## Resumo

Implementar 6 novos tipos de steps para o Flow Builder:
1. **Notificacao** - Envia notificacao interna para usuarios
2. **Notificacao de Transferencia** - Notifica usuario de transferencia de conversa
3. **Atribuir Agente de IA** - Vincula um agente de IA a conversa
4. **Transferir Agente Humano** - Transfere conversa para usuario especifico
5. **Encerrar Conversa** - Marca conversa como encerrada
6. **Programar Acao** - Agenda execucao futura baseada em data fixa ou campo do lead

---

## Arquitetura

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                          NOVOS NOS DO FLOW BUILDER                           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  │
│  │  🔔 Notificacao     │  │  📢 Transf. Notif   │  │  🤖 Agente IA       │  │
│  │  Tipo: notifica     │  │  Tipo: notifica +   │  │  Tipo: selecao de   │  │
│  │  usuarios internos  │  │  transferencia      │  │  ai_agents          │  │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘  │
│                                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  │
│  │  👤 Agente Humano   │  │  ✅ Encerrar Conv   │  │  📅 Programar Acao  │  │
│  │  Tipo: selecao de   │  │  Tipo: fecha        │  │  Tipo: data fixa ou │  │
│  │  profiles           │  │  conversa           │  │  campo do lead      │  │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Tipos de Step (src/types/flow.ts)

### Novos tipos a adicionar ao FlowStepType:

```typescript
export type FlowStepType = 
  // ... tipos existentes ...
  | 'notification'           // Notificacao interna
  | 'transfer_notification'  // Notificacao de transferencia
  | 'assign_ai_agent'        // Atribuir Agente de IA
  | 'transfer_human_agent'   // Transferir para Agente Humano
  | 'close_conversation'     // Encerrar Conversa
  | 'schedule_action';       // Programar Acao
```

### Novas interfaces:

```typescript
// Notificacao interna para usuarios
export interface FlowStepNotification extends FlowStepBase {
  type: 'notification';
  config: {
    title: string;
    message: string;
    target_users: string[]; // UUIDs dos profiles
    notification_type: 'info' | 'warning' | 'success' | 'error';
  };
}

// Notificacao de transferencia
export interface FlowStepTransferNotification extends FlowStepBase {
  type: 'transfer_notification';
  config: {
    target_user_id: string; // UUID do profile
    message?: string;       // Mensagem opcional
  };
}

// Atribuir Agente de IA
export interface FlowStepAssignAIAgent extends FlowStepBase {
  type: 'assign_ai_agent';
  config: {
    ai_agent_id: string;    // UUID do ai_agents
    ai_agent_name?: string; // Nome para exibicao
  };
}

// Transferir para Agente Humano
export interface FlowStepTransferHumanAgent extends FlowStepBase {
  type: 'transfer_human_agent';
  config: {
    target_user_id: string;    // UUID do profile
    target_user_name?: string; // Nome para exibicao
    notify_user?: boolean;     // Enviar notificacao?
  };
}

// Encerrar Conversa
export interface FlowStepCloseConversation extends FlowStepBase {
  type: 'close_conversation';
  config: {
    closure_reason?: string; // Motivo opcional
  };
}

// Programar Acao
export interface FlowStepScheduleAction extends FlowStepBase {
  type: 'schedule_action';
  config: {
    schedule_type: 'fixed_date' | 'lead_field'; // Tipo de agendamento
    fixed_date?: string;                        // Data/hora fixa (ISO string)
    lead_field?: string;                        // Campo do lead (ex: 'data_agendamento')
    offset_days?: number;                       // Dias antes/depois (-1 = dia anterior)
    offset_hours?: number;                      // Hora do dia para executar
    target_flow_id?: string;                    // Flow a executar (opcional, senao continua)
    target_step_id?: string;                    // Step especifico a executar
  };
}
```

---

## 2. Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/flow/visual/pickers/UserPicker.tsx` | Componente para selecionar usuarios (profiles) |
| `src/components/flow/visual/pickers/AIAgentPicker.tsx` | Componente para selecionar agentes de IA |
| `src/components/flow/visual/pickers/LeadFieldPicker.tsx` | Componente para selecionar campos do lead |

---

## 3. Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/types/flow.ts` | Adicionar novos tipos e interfaces |
| `src/components/flow/visual/NodePalette.tsx` | Adicionar 6 novos nos na paleta |
| `src/components/flow/visual/NodeConfigPanel.tsx` | Adicionar configuradores para cada tipo |
| `src/lib/hooks/use-flow-builder.ts` | Adicionar configs padrao para novos tipos |
| `supabase/functions/flows-executor/index.ts` | Adicionar handlers para cada tipo |

---

## 4. Migracao de Banco de Dados

### Nova tabela `flow_scheduled_actions`:

```sql
CREATE TABLE public.flow_scheduled_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid REFERENCES public.flows(id) ON DELETE CASCADE,
  run_id uuid,
  step_id text NOT NULL,
  lead_id bigint,
  phone_number text,
  scheduled_for timestamp with time zone NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'cancelled', 'failed')),
  target_flow_id uuid REFERENCES public.flows(id),
  target_step_id text,
  context jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  executed_at timestamp with time zone,
  error_message text
);

CREATE INDEX idx_flow_scheduled_actions_pending ON flow_scheduled_actions(scheduled_for) 
  WHERE status = 'pending';
CREATE INDEX idx_flow_scheduled_actions_phone ON flow_scheduled_actions(phone_number);
```

---

## 5. Detalhes de Implementacao

### 5.1 NodePalette.tsx - Novos Nos

```typescript
// Adicionar ao array nodeTypes:

// GERENCIAMENTO
{
  type: 'notification' as const,
  label: 'Notificacao',
  description: 'Notifica usuarios internos',
  icon: Bell,
},
{
  type: 'transfer_notification' as const,
  label: 'Notificar Transferencia',
  description: 'Avisa usuario de transferencia',
  icon: Send,
},
{
  type: 'assign_ai_agent' as const,
  label: 'Atribuir Agente IA',
  description: 'Vincula agente de IA',
  icon: Bot,
},
{
  type: 'transfer_human_agent' as const,
  label: 'Transferir Humano',
  description: 'Transfere para usuario',
  icon: UserCheck,
},
{
  type: 'close_conversation' as const,
  label: 'Encerrar Conversa',
  description: 'Marca conversa como encerrada',
  icon: CheckCircle,
},
{
  type: 'schedule_action' as const,
  label: 'Programar Acao',
  description: 'Agenda acao para data futura',
  icon: CalendarClock,
},
```

### 5.2 Configuradores no NodeConfigPanel.tsx

#### NotificationConfig:
- Campo de titulo (texto)
- Campo de mensagem (textarea com placeholders)
- Seletor multiplo de usuarios (UserPicker)
- Tipo de notificacao (info/warning/success/error)

#### TransferNotificationConfig:
- Seletor de usuario destino (UserPicker)
- Campo de mensagem opcional

#### AssignAIAgentConfig:
- Seletor de agente de IA (AIAgentPicker)
- Lista busca da tabela `ai_agents`

#### TransferHumanAgentConfig:
- Seletor de usuario destino (UserPicker)
- Checkbox "Notificar usuario"

#### CloseConversationConfig:
- Campo de motivo do encerramento (opcional)

#### ScheduleActionConfig:
- Radio: "Data fixa" ou "Campo do lead"
- Se data fixa: DateTimePicker
- Se campo do lead:
  - Seletor de campo (LeadFieldPicker com campos de data)
  - Offset em dias (-1, 0, +1, etc)
  - Hora do dia para executar
- Seletor de flow/step a executar (opcional)

### 5.3 Pickers Auxiliares

#### UserPicker.tsx:
```typescript
// Busca profiles com display_name e email
// Suporta selecao unica ou multipla
// Mostra avatar quando disponivel
```

#### AIAgentPicker.tsx:
```typescript
// Busca ai_agents com id, name, description
// Mostra descricao do agente
```

#### LeadFieldPicker.tsx:
```typescript
// Lista campos do lead que sao datas:
// - data_agendamento
// - data_criacao_agendamento
// - data_retorno_ligacao
// - data_analise
// - data_confirmacao_ficha
// - criado
```

---

## 6. Edge Function - Novos Handlers

### executeNotification:
- Insere na tabela `notifications` (se existir) ou loga para usuarios
- Envia via Realtime para usuarios online

### executeTransferNotification:
- Busca usuario destino
- Cria notificacao de transferencia
- Atualiza `whatsapp_conversations.assigned_to`

### executeAssignAIAgent:
- Busca agente de IA
- Atualiza `agent_operator_assignments` para o telefone
- Registra no contexto do flow

### executeTransferHumanAgent:
- Atualiza `whatsapp_conversations.assigned_to`
- Marca `needs_attention = true`, `status = 'pending_agent'`
- Opcionalmente notifica usuario

### executeCloseConversation:
- Insere registro em `whatsapp_conversation_closures`
- Com phone_number e closure_reason

### executeScheduleAction:
- Calcula data de execucao:
  - Se `fixed_date`: usa diretamente
  - Se `lead_field`: busca valor do campo, aplica offset
- Insere em `flow_scheduled_actions`
- Retorna imediatamente (nao bloqueia flow)

---

## 7. Campos do Lead Disponiveis para Agendamento

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `data_agendamento` | date | Data do agendamento |
| `data_criacao_agendamento` | timestamp | Quando agendamento foi criado |
| `data_retorno_ligacao` | timestamp | Data para retornar ligacao |
| `data_analise` | timestamp | Data da analise |
| `data_confirmacao_ficha` | timestamp | Data de confirmacao da ficha |
| `data_criacao_ficha` | timestamp | Data de criacao da ficha |
| `criado` | timestamp | Data de criacao do lead |

---

## 8. Fluxo de Uso - Programar Acao

Exemplo: Enviar lembrete 1 dia antes do agendamento as 9h

1. Arrasta "Programar Acao" para o canvas
2. Seleciona "Campo do lead"
3. Escolhe campo: `data_agendamento`
4. Define offset: `-1 dia`
5. Define hora: `09:00`
6. Seleciona flow de lembrete ou step especifico

### Execucao:
- Quando o flow roda, calcula: `data_agendamento - 1 dia + 09:00`
- Insere em `flow_scheduled_actions` com `scheduled_for`
- Um cron job (a configurar) processa acoes pendentes

---

## 9. Executor de Acoes Agendadas

### Novo Edge Function: `flows-scheduler`:
- Roda via cron a cada minuto
- Busca `flow_scheduled_actions` onde `scheduled_for <= now() AND status = 'pending'`
- Para cada acao:
  - Executa o flow/step configurado
  - Atualiza status para 'executed' ou 'failed'

### Cron Job (pg_cron):
```sql
SELECT cron.schedule(
  'flow-scheduler-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://[PROJECT_ID].supabase.co/functions/v1/flows-scheduler',
    headers:='{"Authorization": "Bearer [ANON_KEY]"}'::jsonb
  );
  $$
);
```

---

## Resumo de Entregaveis

| Item | Tipo | Prioridade |
|------|------|------------|
| Tipos em flow.ts | Tipos | Alta |
| NodePalette novos nos | UI | Alta |
| NodeConfigPanel configs | UI | Alta |
| UserPicker | Componente | Alta |
| AIAgentPicker | Componente | Alta |
| LeadFieldPicker | Componente | Media |
| Handlers no flows-executor | Backend | Alta |
| Tabela flow_scheduled_actions | Banco | Media |
| Edge Function flows-scheduler | Backend | Media |
| Cron job de agendamento | Infraestrutura | Media |

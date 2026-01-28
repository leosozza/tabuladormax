
# Sistema de Auto-Resposta do Agente de IA com Filtros

## Visão Geral

Implementar um sistema que permite ativar agentes de IA para responder automaticamente a conversas do WhatsApp com base em filtros configuráveis (etapa do lead, status de resposta, janela de 24h).

## Arquitetura da Solução

### Fluxo de Funcionamento

```text
┌─────────────────────────────────────────────────────────────────┐
│                    CONFIGURAÇÃO (UI)                             │
│  /admin/ai-agents → Agente → Ativar Auto-Resposta                │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ ☑ Auto-Resposta Ativa                                       │ │
│  │                                                             │ │
│  │ Responder quando:                                           │ │
│  │ ☑ Etapa: [Lead convertido ▼]                                │ │
│  │ ☑ Status: [Aguardando resposta ▼]                           │ │
│  │ ☑ Janela 24h: [Aberta ▼]                                    │ │
│  │                                                             │ │
│  │ Ações Proativas:                                            │ │
│  │ ☑ Mensagem quando janela < 2h                               │ │
│  │   "Olá! Só passando para ver se..."                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────────┐
│               TRIGGER: Mensagem Inbound                          │
│  gupshup-webhook recebe mensagem do cliente                      │
│              ↓                                                   │
│  Verifica se há agente com auto_respond_enabled = true           │
│  que atende os filtros configurados                              │
│              ↓                                                   │
│  [SIM] → Chama whatsapp-ai-assist para gerar resposta            │
│        → Envia via gupshup-send-message                          │
│              ↓                                                   │
│  [NÃO] → Segue fluxo normal (notifica operador)                  │
└─────────────────────────────────────────────────────────────────┘
              +
┌─────────────────────────────────────────────────────────────────┐
│            CRON: Janela Próxima de Expirar                       │
│  A cada 15 minutos, verificar conversas onde:                    │
│  - Janela 24h expira em < 2 horas                                │
│  - Conversa não foi encerrada                                    │
│  - Agente com window_proactive_enabled = true                    │
│              ↓                                                   │
│  Envia mensagem proativa para manter janela aberta               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Parte 1: Alterações no Banco de Dados

### 1.1 Adicionar campos na tabela ai_agents

Novos campos para controlar auto-resposta:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| auto_respond_enabled | BOOLEAN | Liga/desliga auto-resposta |
| auto_respond_filters | JSONB | Filtros: etapas, status, janela |
| window_proactive_enabled | BOOLEAN | Mensagem proativa quando janela fechando |
| window_proactive_message | TEXT | Mensagem a enviar |
| window_proactive_hours | INTEGER | Horas antes de expirar (default: 2) |
| max_auto_responses_per_conversation | INTEGER | Limite de respostas automáticas |
| auto_respond_cooldown_minutes | INTEGER | Tempo mínimo entre respostas |

Estrutura do `auto_respond_filters`:
```json
{
  "etapas": ["Lead convertido", "UC_DDVFX3"],
  "response_status": ["waiting", "never"],
  "window_status": "open",
  "deal_status": ["open", "won"]
}
```

### 1.2 Criar tabela de log de auto-respostas

Para rastrear e limitar respostas automáticas:

```sql
CREATE TABLE ai_auto_response_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES ai_agents(id),
  phone_number TEXT NOT NULL,
  bitrix_id TEXT,
  trigger_type TEXT, -- 'inbound_message' | 'window_proactive'
  input_message TEXT,
  output_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Parte 2: Lógica de Auto-Resposta no Webhook

### 2.1 Modificar gupshup-webhook/index.ts

Após receber mensagem inbound e identificar o lead:

```typescript
// Verificar se há agente com auto-resposta ativa para este contexto
const { agent, shouldRespond } = await checkAutoRespondAgent(
  supabase,
  leadId,
  leadEtapa,
  responseStatus,
  isWindowOpen
);

if (shouldRespond && agent) {
  // Verificar cooldown (não responder se já respondeu recentemente)
  const canRespond = await checkAutoRespondCooldown(
    supabase,
    phoneNumber,
    agent.id,
    agent.auto_respond_cooldown_minutes || 5
  );
  
  if (canRespond) {
    await processAutoResponse(supabase, agent, phoneNumber, message, leadId);
  }
}
```

### 2.2 Nova função checkAutoRespondAgent

```typescript
async function checkAutoRespondAgent(
  supabase: any,
  leadId: number | null,
  leadEtapa: string | null,
  responseStatus: string | null,
  isWindowOpen: boolean
): Promise<{ agent: any; shouldRespond: boolean }> {
  // Buscar agentes com auto_respond_enabled = true
  const { data: agents } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('is_active', true)
    .eq('auto_respond_enabled', true);

  if (!agents?.length) {
    return { agent: null, shouldRespond: false };
  }

  for (const agent of agents) {
    const filters = agent.auto_respond_filters || {};
    
    // Verificar filtros
    if (filters.etapas?.length && !filters.etapas.includes(leadEtapa)) continue;
    if (filters.response_status?.length && !filters.response_status.includes(responseStatus)) continue;
    if (filters.window_status === 'open' && !isWindowOpen) continue;
    if (filters.window_status === 'closed' && isWindowOpen) continue;
    
    return { agent, shouldRespond: true };
  }

  return { agent: null, shouldRespond: false };
}
```

---

## Parte 3: Edge Function para Mensagem Proativa de Janela

### 3.1 Criar supabase/functions/ai-window-proactive/index.ts

Executada via cron a cada 15 minutos:

```typescript
// 1. Buscar agentes com window_proactive_enabled = true
// 2. Buscar conversas onde janela expira em < X horas
// 3. Verificar se conversa não está encerrada
// 4. Verificar se já não enviou mensagem proativa hoje
// 5. Enviar mensagem e registrar log
```

### 3.2 Adicionar cron job

```sql
SELECT cron.schedule(
  'ai-window-proactive',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url:='https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/ai-window-proactive',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ANON_KEY"}'::jsonb
  );
  $$
);
```

---

## Parte 4: Interface de Configuração

### 4.1 Novo componente AIAgentAutoRespondConfig.tsx

Painel de configuração dentro do card do agente em `/admin/ai-agents`:

```text
┌────────────────────────────────────────────────────────────┐
│ 🤖 Central de Atendimento                    [Ativo] [⚙️]  │
├────────────────────────────────────────────────────────────┤
│ Auto-Resposta                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ ☐ Ativar respostas automáticas                         │ │
│ │                                                        │ │
│ │ Responder apenas quando:                               │ │
│ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │ │
│ │ │ Etapas       │ │ Status       │ │ Janela       │    │ │
│ │ │ ☑ Convertido │ │ ☑ Aguardando │ │ ● Aberta     │    │ │
│ │ │ ☑ Triagem    │ │ ☑ S/resposta │ │ ○ Todas      │    │ │
│ │ │ ☐ Agendados  │ │ ☐ Respondeu  │ │              │    │ │
│ │ └──────────────┘ └──────────────┘ └──────────────┘    │ │
│ │                                                        │ │
│ │ Limites:                                               │ │
│ │ Cooldown: [5] min  │  Máx respostas: [10] por conversa │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ Mensagem Proativa (Janela Expirando)                       │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ ☐ Enviar quando janela < [2] horas                     │ │
│ │ ┌────────────────────────────────────────────────────┐ │ │
│ │ │ Olá! Só passando para ver se você tem alguma       │ │ │
│ │ │ dúvida ou se posso ajudar com algo mais. 😊        │ │ │
│ │ └────────────────────────────────────────────────────┘ │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### 4.2 Indicador na página /whatsapp

Mostrar badge quando conversa está sendo atendida por IA:

```tsx
{isAutoRespondActive && (
  <Badge variant="secondary" className="gap-1 bg-purple-100 text-purple-700">
    <Bot className="h-3 w-3" />
    IA Ativa
  </Badge>
)}
```

---

## Parte 5: Modificar whatsapp-ai-assist para modo automático

Adicionar flag `is_auto_response: true` que:
- Usa tom mais proativo
- Inclui contexto do lead (etapa, histórico)
- Limita respostas para evitar loops

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/ai-window-proactive/index.ts` | Cron para mensagens proativas |
| `src/components/admin/ai-agents/AIAgentAutoRespondConfig.tsx` | UI de configuração |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/gupshup-webhook/index.ts` | Adicionar lógica de auto-resposta |
| `supabase/functions/whatsapp-ai-assist/index.ts` | Suportar modo automático |
| `src/hooks/useAIAgents.ts` | Novos campos do agente |
| `src/components/admin/ai-agents/AIAgentsList.tsx` | Mostrar status auto-resposta |
| `src/components/admin/ai-agents/AIAgentFormDialog.tsx` | Campos de configuração |
| `src/pages/admin/AIAgents.tsx` | Integrar novo componente |
| `src/components/whatsapp/AdminConversationList.tsx` | Badge "IA Ativa" |

## Migration SQL

```sql
-- Adicionar campos de auto-resposta
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS auto_respond_enabled BOOLEAN DEFAULT false;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS auto_respond_filters JSONB DEFAULT '{}';
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS window_proactive_enabled BOOLEAN DEFAULT false;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS window_proactive_message TEXT;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS window_proactive_hours INTEGER DEFAULT 2;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS max_auto_responses_per_conversation INTEGER DEFAULT 10;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS auto_respond_cooldown_minutes INTEGER DEFAULT 5;

-- Tabela de log
CREATE TABLE ai_auto_response_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  bitrix_id TEXT,
  trigger_type TEXT NOT NULL,
  input_message TEXT,
  output_message TEXT,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_auto_response_phone_date ON ai_auto_response_log(phone_number, created_at DESC);
CREATE INDEX idx_auto_response_agent ON ai_auto_response_log(agent_id);

-- RLS
ALTER TABLE ai_auto_response_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read auto response log" ON ai_auto_response_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Cron para mensagens proativas
SELECT cron.schedule(
  'ai-window-proactive',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url:='https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/ai-window-proactive',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrdnZ0ZnFmZ2dkZHpvdHhsdHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDI0MzgsImV4cCI6MjA3NTQxODQzOH0.8WtKh58rp6ql2W3tQq9hLntv07ZyIFFE5kDRPcvnplU'
    )
  );
  $$
);
```

---

## Segurança e Limites

1. **Cooldown**: Mínimo 5 minutos entre respostas automáticas para o mesmo número
2. **Máximo por conversa**: Limite de 10 respostas automáticas por conversa
3. **Janela obrigatória**: Só responde se janela 24h estiver aberta
4. **Log completo**: Todas as respostas automáticas são registradas
5. **Desativação manual**: Operador pode desativar auto-resposta para conversa específica

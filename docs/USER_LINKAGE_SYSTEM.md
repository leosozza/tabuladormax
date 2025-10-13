# Sistema de Vínculo de Usuários

## Visão Geral

O sistema de vínculo permite associar usuários do Tabulador com agentes do Chatwoot (Whatswoot) e operadores de telemarketing do Bitrix. Quando um usuário realiza uma tabulação, o sistema automaticamente registra qual operador Bitrix está vinculado a ele.

## Funcionalidades

### 1. Campos de Vínculo no Perfil do Usuário

Cada usuário no Tabulador pode ter:
- **Agente Chatwoot vinculado**: ID do agente Chatwoot associado ao usuário
- **Operador Bitrix vinculado**: ID do operador de telemarketing Bitrix associado ao usuário

### 2. Gerenciamento de Vínculos (Página de Usuários)

Administradores podem gerenciar os vínculos na página `/users`:

- Visualizar todos os usuários cadastrados
- Editar o role de cada usuário (Admin/Agente)
- **Vincular agente Chatwoot**: Selecionar qual agente do Chatwoot está associado ao usuário
- **Vincular operador Bitrix**: Selecionar qual operador de telemarketing do Bitrix está associado ao usuário

A página carrega automaticamente:
- Lista de agentes Chatwoot (configurados via `config_kv`)
- Lista de operadores Bitrix (via API `crm.item.list` com `entityTypeId=1144`)

### 3. Registro Automático nas Tabulações

Quando um usuário executa uma ação de tabulação (clique em botão), o sistema automaticamente:

1. Identifica o usuário logado
2. Busca o perfil do usuário incluindo o `bitrix_operator_id` vinculado
3. Registra na tabela `actions_log`:
   - `user_id`: UUID do usuário que executou a ação
   - `payload.bitrix_operator_id`: ID do operador Bitrix vinculado ao usuário
   - Outros dados da ação (campo, valor, webhook, etc.)

## Estrutura do Banco de Dados

### Tabela `profiles`

Novos campos adicionados:

```sql
- chatwoot_agent_id: INTEGER (nullable)
  -- ID do agente Chatwoot vinculado ao usuário
  
- bitrix_operator_id: TEXT (nullable)
  -- ID do operador Bitrix vinculado ao usuário
  -- Vem da API crm.item.list com entityTypeId=1144
```

### Tabela `actions_log`

Campo existente usado:
```sql
- user_id: UUID (nullable, FK para auth.users)
  -- ID do usuário que executou a tabulação
```

Campo payload contém:
```json
{
  "webhook": "...",
  "field": "...",
  "value": "...",
  "bitrix_operator_id": "123",  // ID do operador vinculado
  "sync_target": "bitrix",
  // ... outros campos
}
```

## Configuração

### 1. Configurar Agentes Chatwoot

Para que os agentes Chatwoot apareçam na lista de seleção, é necessário configurá-los na tabela `config_kv`:

```sql
INSERT INTO config_kv (key, value) VALUES (
  'chatwoot_agents',
  '[
    {"id": 1, "name": "João Silva", "email": "joao@example.com", "role": "agent"},
    {"id": 2, "name": "Maria Santos", "email": "maria@example.com", "role": "agent"}
  ]'::jsonb
);
```

**Estrutura do JSON:**
- `id` (number): ID do agente no Chatwoot
- `name` (string): Nome do agente
- `email` (string): Email do agente
- `role` (string, opcional): Função do agente (ex: "agent", "administrator")

### 2. Configurar Operadores Bitrix

Os operadores Bitrix são carregados automaticamente via API do Bitrix:

**Endpoint:** `crm.item.list.json?entityTypeId=1144`

A função `getBitrixOperators()` em `src/lib/bitrix.ts` faz a requisição e retorna os operadores disponíveis.

**Requisitos:**
- Webhook do Bitrix configurado corretamente
- Acesso à API `crm.item.list` com `entityTypeId=1144`
- Operadores cadastrados no Bitrix com este entityTypeId

## Uso

### Para Administradores

1. Acesse a página **Gerenciar Usuários** (`/users`)
2. Para cada usuário, selecione:
   - **Agente Chatwoot**: Dropdown com agentes configurados
   - **Operador Bitrix**: Dropdown com operadores do Bitrix
3. As alterações são salvas automaticamente

### Para Usuários/Agentes

1. Faça login no Tabulador
2. Realize tabulações normalmente clicando nos botões
3. O sistema automaticamente registra:
   - Seu `user_id` 
   - O `bitrix_operator_id` vinculado ao seu perfil

### Visualizando Logs

Os logs de tabulação com informações de usuário e operador podem ser consultados na tabela `actions_log`:

```sql
SELECT 
  al.id,
  al.created_at,
  al.action_label,
  al.user_id,
  al.payload->>'bitrix_operator_id' as bitrix_operator_id,
  p.email as user_email,
  p.display_name as user_name
FROM actions_log al
LEFT JOIN profiles p ON p.id = al.user_id
WHERE al.lead_id = 123
ORDER BY al.created_at DESC;
```

## Retrocompatibilidade

O sistema mantém total retrocompatibilidade:

- **Usuários antigos** sem vínculos configurados continuam funcionando normalmente
- O campo `bitrix_operator_id` é opcional (nullable)
- Logs antigos não possuem `bitrix_operator_id` no payload, mas isso não causa erros
- Tabulações continuam funcionando mesmo sem vínculos configurados

## API Reference

### Funções Principais

#### `getBitrixOperators(): Promise<BitrixOperator[]>`
Busca lista de operadores de telemarketing do Bitrix.

**Retorno:**
```typescript
interface BitrixOperator {
  id: string;
  title: string;
  name?: string;
  [key: string]: any;
}
```

#### `getChatwootAgents(): Promise<ChatwootAgent[]>`
Busca lista de agentes Chatwoot da configuração.

**Retorno:**
```typescript
interface ChatwootAgent {
  id: number;
  name: string;
  email: string;
  role?: string;
}
```

## Troubleshooting

### Agentes Chatwoot não aparecem na lista

**Solução:** Verificar se os agentes estão configurados na tabela `config_kv` com a key `'chatwoot_agents'`.

### Operadores Bitrix não carregam

**Possíveis causas:**
1. Webhook do Bitrix não configurado
2. `entityTypeId=1144` não existe no Bitrix
3. Erro de permissão na API do Bitrix

**Solução:** Verificar logs do console do navegador e confirmar configuração do Bitrix.

### Logs não mostram bitrix_operator_id

**Causa:** Usuário não tem operador vinculado em seu perfil.

**Solução:** Administrador deve vincular o operador na página de usuários.

## Migração

A migração `20251013195643_add_user_linkage_fields.sql` adiciona automaticamente os novos campos:

```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS chatwoot_agent_id INTEGER,
ADD COLUMN IF NOT EXISTS bitrix_operator_id TEXT;
```

Campos são criados como NULL, permitindo que o sistema continue funcionando sem vínculos configurados.

## Próximos Passos

Possíveis melhorias futuras:
- Integração direta com API do Chatwoot para buscar agentes automaticamente
- Dashboard mostrando estatísticas por operador Bitrix
- Relatórios de performance por usuário/operador
- Alertas quando operadores não estão vinculados
- Validação de vínculos antes de permitir tabulação

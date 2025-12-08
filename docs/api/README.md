# TabuladorMax API Documentation

**Base URL:** `https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1`

**Versão:** 1.0.0

---

## 🔐 Autenticação

O TabuladorMax suporta três métodos de autenticação:

### 1. API Key (Recomendado para integrações)

```bash
curl -X POST "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/scouter-app-api" \
  -H "X-API-Key: tmx_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"action": "get_stats", "bitrix_id": 123}'
```

**Formato da chave:** `tmx_live_` + 48 caracteres hexadecimais

**Escopos disponíveis:**
- `*` - Acesso total
- `scouter` - Acesso às APIs do app scouter
- `leads:read` - Leitura de leads
- `leads:write` - Escrita de leads
- `flows` - Gerenciamento de fluxos
- `admin` - Operações administrativas

### 2. JWT Bearer Token (Para usuários autenticados)

```bash
curl -X POST "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/flows-api" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"nome": "Meu Fluxo", "steps": []}'
```

### 3. Access Key (Legado - apenas scouter-app-api)

```bash
curl -X POST "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/scouter-app-api" \
  -H "Content-Type: application/json" \
  -d '{"action": "login", "access_key": "SCOUTER123"}'
```

---

## ⚡ Rate Limiting

| Tipo | Limite Padrão | Customizável |
|------|---------------|--------------|
| API Key | 60 req/min | Sim |
| JWT | 120 req/min | Não |
| Access Key | 30 req/min | Não |

---

## 📱 Scouter App API

**Endpoint:** `POST /scouter-app-api`

API para o aplicativo mobile de scouters.

### Login

```bash
curl -X POST "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/scouter-app-api" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "login",
    "access_key": "CHAVE_DO_SCOUTER"
  }'
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "scouter_id": "uuid",
    "scouter_name": "João Silva",
    "scouter_photo": "https://...",
    "bitrix_id": 123
  }
}
```

### Obter Estatísticas

```bash
curl -X POST "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/scouter-app-api" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_stats",
    "bitrix_id": 123,
    "params": {
      "date_preset": "today",
      "project_id": "uuid-opcional"
    }
  }'
```

**Parâmetros de data:**
- `date_preset`: `"today"`, `"yesterday"`, `"week"`, `"month"`
- `start_date`: ISO 8601 (ex: `"2024-01-01"`)
- `end_date`: ISO 8601 (ex: `"2024-01-31"`)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "total": 45,
    "confirmados": 38,
    "compareceram": 12,
    "pendentes": 7,
    "com_foto": 42,
    "agendados": 25,
    "reagendar": 3
  }
}
```

### Obter Ranking

```bash
curl -X POST "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/scouter-app-api" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_ranking",
    "bitrix_id": 123,
    "params": {
      "date_preset": "week"
    }
  }'
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    { "name": "João Silva", "total": 45, "confirmadas": 38 },
    { "name": "Maria Santos", "total": 42, "confirmadas": 35 }
  ]
}
```

### Listar Projetos

```bash
curl -X POST "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/scouter-app-api" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_projects",
    "bitrix_id": 123
  }'
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "project_id": "uuid",
      "project_name": "Projeto A",
      "project_code": "PRJ-A",
      "lead_count": 150
    }
  ]
}
```

### Listar Leads

```bash
curl -X POST "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/scouter-app-api" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_leads",
    "bitrix_id": 123,
    "params": {
      "date_preset": "today",
      "project_id": "uuid-opcional"
    }
  }'
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "lead_id": 12345,
      "nome_modelo": "Ana Costa",
      "criado": "2024-01-15T10:30:00Z",
      "address": "Rua das Flores, 123",
      "etapa_lead": "Agendados",
      "celular": "11999998888",
      "commercial_project_id": "uuid"
    }
  ]
}
```

---

## 🔄 Flows API

**Endpoint:** `/flows-api`

Gerenciamento de fluxos de automação.

### Listar Fluxos

```bash
curl -X GET "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/flows-api" \
  -H "Authorization: Bearer JWT_TOKEN"
```

### Criar Fluxo

```bash
curl -X POST "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/flows-api" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Fluxo de Boas-vindas",
    "descricao": "Envia mensagem de boas-vindas",
    "steps": [
      {
        "type": "message",
        "template": "welcome_template"
      }
    ]
  }'
```

### Atualizar Fluxo

```bash
curl -X PUT "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/flows-api/FLOW_ID" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Fluxo Atualizado",
    "ativo": true
  }'
```

### Deletar Fluxo

```bash
curl -X DELETE "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/flows-api/FLOW_ID" \
  -H "Authorization: Bearer JWT_TOKEN"
```

---

## 🔑 API Key Management

**Endpoint:** `POST /api-key-management`

Gerenciamento de API Keys (requer autenticação de admin).

### Gerar Nova API Key

```bash
curl -X POST "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/api-key-management" \
  -H "Authorization: Bearer JWT_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate",
    "name": "Integração Mobile",
    "description": "Chave para app mobile",
    "scopes": ["scouter", "leads:read"],
    "rate_limit": 120,
    "expires_at": "2025-12-31T23:59:59Z"
  }'
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "key_id": "uuid",
    "api_key": "tmx_live_abc123...",
    "key_prefix": "tmx_live_abc123",
    "message": "⚠️ Guarde esta chave! Ela não será exibida novamente."
  }
}
```

### Listar API Keys

```bash
curl -X POST "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/api-key-management" \
  -H "Authorization: Bearer JWT_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"action": "list"}'
```

### Revogar API Key

```bash
curl -X POST "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/api-key-management" \
  -H "Authorization: Bearer JWT_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "revoke",
    "key_id": "uuid-da-chave"
  }'
```

### Rotacionar API Key

```bash
curl -X POST "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/api-key-management" \
  -H "Authorization: Bearer JWT_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "rotate",
    "key_id": "uuid-da-chave"
  }'
```

### Ver Uso de API Key

```bash
curl -X POST "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/api-key-management" \
  -H "Authorization: Bearer JWT_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_usage",
    "key_id": "uuid-da-chave"
  }'
```

---

## 🔗 Bitrix24 Integration

### Webhook de Leads

**Endpoint:** `POST /bitrix-webhook`

Recebe eventos do Bitrix24 CRM.

```bash
curl -X POST "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/bitrix-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "ONCRMLEAD*",
    "data": {
      "FIELDS": { "ID": "12345" }
    }
  }'
```

### Buscar Lead

**Endpoint:** `POST /bitrix-get-lead`

```bash
curl -X POST "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/bitrix-get-lead" \
  -H "Content-Type: application/json" \
  -d '{"lead_id": 12345}'
```

---

## 💬 Chatwoot Integration

### Autenticação Chatwoot

**Endpoint:** `POST /chatwoot-auth`

```bash
curl -X POST "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/chatwoot-auth" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@email.com",
    "password": "senha"
  }'
```

### Enviar Mensagem

**Endpoint:** `POST /chatwoot-messages`

```bash
curl -X POST "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/chatwoot-messages" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": 12345,
    "message": "Olá, como posso ajudar?"
  }'
```

---

## 📊 Diagnósticos

### Métricas

**Endpoint:** `GET /diagnostics/metrics`

```bash
curl -X GET "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/diagnostics/metrics" \
  -H "Authorization: Bearer JWT_TOKEN"
```

### Logs

**Endpoint:** `GET /diagnostics/logs`

```bash
curl -X GET "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/diagnostics/logs?level=error&limit=50" \
  -H "Authorization: Bearer JWT_TOKEN"
```

### Health Check

**Endpoint:** `GET /diagnostics/health`

```bash
curl -X GET "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/diagnostics/health" \
  -H "Authorization: Bearer JWT_TOKEN"
```

---

## ❌ Códigos de Erro

| Código | Significado |
|--------|-------------|
| 400 | Bad Request - Parâmetros inválidos |
| 401 | Unauthorized - Autenticação necessária |
| 403 | Forbidden - Sem permissão |
| 404 | Not Found - Recurso não encontrado |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error - Erro no servidor |

**Formato de erro padrão:**
```json
{
  "success": false,
  "error": "Descrição do erro"
}
```

---

## 🔧 SDKs

### JavaScript/TypeScript

```typescript
import { supabase } from "@/integrations/supabase/client";

// Usando Supabase Client
const { data, error } = await supabase.functions.invoke("scouter-app-api", {
  body: {
    action: "get_stats",
    bitrix_id: 123,
    params: { date_preset: "today" }
  }
});

// Usando API Key diretamente
const response = await fetch(
  "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/scouter-app-api",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": "tmx_live_..."
    },
    body: JSON.stringify({
      action: "get_stats",
      bitrix_id: 123
    })
  }
);
```

### Python

```python
import requests

BASE_URL = "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1"
API_KEY = "tmx_live_..."

response = requests.post(
    f"{BASE_URL}/scouter-app-api",
    headers={
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
    },
    json={
        "action": "get_stats",
        "bitrix_id": 123,
        "params": {"date_preset": "today"}
    }
)

data = response.json()
```

### cURL

```bash
# Template genérico
curl -X POST "https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: tmx_live_..." \
  -d '{"key": "value"}'
```

---

## 📝 Changelog

### v1.0.0 (2024-01)
- API Keys com escopos e rate limiting
- Documentação completa
- Suporte a múltiplos métodos de autenticação

---

## 🆘 Suporte

Para suporte técnico, entre em contato com a equipe de desenvolvimento.

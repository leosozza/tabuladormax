
# Plano: Cadastrar Provedores Faltantes e Adicionar Sistema de Níveis

## Situação Atual

A tabela `ai_providers` tem apenas **7 provedores**:
- Anthropic Claude
- Groq (Gratuito)
- Lovable AI
- OpenAI
- OpenRouter
- Together AI
- xAI Grok

Os provedores mencionados (SambaNova, Cerebras, DeepSeek, Google Studio) **não foram cadastrados**.

## Alterações Necessárias

### 1. Adicionar Coluna `tier` na Tabela `ai_providers`

Criar uma nova coluna para classificar os provedores em níveis:

```sql
ALTER TABLE ai_providers 
ADD COLUMN tier text DEFAULT 'standard' 
CHECK (tier IN ('free', 'standard', 'professional'));

COMMENT ON COLUMN ai_providers.tier IS 'Nível do provedor: free (gratuito), standard (padrão), professional (profissional)';
```

### 2. Inserir Provedores Faltantes

Cadastrar os 4 provedores que faltam:

| Provedor | Nome Interno | Tier | Modelos |
|----------|--------------|------|---------|
| SambaNova | sambanova | free | Llama 3.1 70B, Llama 3.1 405B |
| Cerebras | cerebras | free | Llama 3.3 70B |
| DeepSeek | deepseek | free | DeepSeek Chat, DeepSeek Reasoner |
| Google AI Studio | google-studio | free | Gemini 2.5 Flash, Gemini 2.5 Pro |

### 3. Atualizar Provedores Existentes com Tier

```sql
UPDATE ai_providers SET tier = 'free' WHERE name IN ('groq', 'sambanova', 'cerebras', 'deepseek', 'google-studio');
UPDATE ai_providers SET tier = 'standard' WHERE name IN ('lovable', 'together', 'openrouter');
UPDATE ai_providers SET tier = 'professional' WHERE name IN ('openai', 'anthropic', 'xai');
```

### 4. Atualizar Interface para Mostrar Níveis

Modificar `AIAgentFormDialog.tsx` para agrupar provedores por tier com badges coloridas:

```
Gratuito (verde):     Groq, SambaNova, Cerebras, DeepSeek, Google Studio
Standard (azul):      Lovable AI, Together AI, OpenRouter
Profissional (roxo):  OpenAI, Anthropic, xAI Grok
```

### 5. Atualizar Interface do Provedor

Adicionar visual diferenciado no Select:

```typescript
// Badge colorida ao lado do nome do provedor
{provider.tier === 'free' && <Badge className="bg-green-500">Gratuito</Badge>}
{provider.tier === 'standard' && <Badge className="bg-blue-500">Standard</Badge>}
{provider.tier === 'professional' && <Badge className="bg-purple-500">Pro</Badge>}
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Migration SQL | Adicionar coluna `tier` |
| Migration SQL | Inserir SambaNova, Cerebras, DeepSeek, Google Studio |
| Migration SQL | Atualizar tier dos provedores existentes |
| `AIAgentFormDialog.tsx` | Exibir badge de tier no Select |
| `AIAgentFormDialog.tsx` | Agrupar provedores por tier |

## Dados dos Novos Provedores

**SambaNova**
- base_url: `https://api.sambanova.ai/v1/chat/completions`
- models: `[{"id": "Meta-Llama-3.1-70B-Instruct", "name": "Llama 3.1 70B"}, {"id": "Meta-Llama-3.1-405B-Instruct", "name": "Llama 3.1 405B"}]`
- tier: free

**Cerebras**
- base_url: `https://api.cerebras.ai/v1/chat/completions`
- models: `[{"id": "llama-3.3-70b", "name": "Llama 3.3 70B"}]`
- tier: free

**DeepSeek**
- base_url: `https://api.deepseek.com/v1/chat/completions`
- models: `[{"id": "deepseek-chat", "name": "DeepSeek Chat"}, {"id": "deepseek-reasoner", "name": "DeepSeek Reasoner"}]`
- tier: free

**Google AI Studio**
- base_url: `https://generativelanguage.googleapis.com/v1beta`
- models: `[{"id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash"}, {"id": "gemini-2.5-pro", "name": "Gemini 2.5 Pro"}]`
- tier: free

## Resultado Esperado

1. **11 provedores** disponíveis no formulário de edição
2. Cada provedor mostrará **badge colorida** indicando seu nível
3. Provedores agrupados por tier para fácil identificação
4. Usuários saberão quais são gratuitos vs pagos

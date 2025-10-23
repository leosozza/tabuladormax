# 🤖 Sistema de IA de Auto-Análise

Sistema completo de debug inteligente que analisa erros, sugere correções e permite aplicar/reverter mudanças com segurança.

## ✨ Funcionalidades

### 1. **Análise Inteligente de Erros**
- Cole qualquer erro (mensagem + stack trace)
- IA analisa o contexto completo
- Identifica causa raiz e impacto
- Sugere 3-5 correções priorizadas

### 2. **Múltiplos Providers de IA**
- **Lovable AI** (padrão, gratuito)
  - `google/gemini-2.5-flash`
  - `google/gemini-2.5-pro`
  - `openai/gpt-5-mini`

- **OpenAI** (requer API key)
  - `gpt-5`, `gpt-5-mini`, `gpt-5-nano`

- **Google Gemini** (requer API key)
  - `gemini-2.0-flash-exp`, `gemini-1.5-pro`

### 3. **Sistema de Correções**
- **Preview de Código** - Visualize antes de aplicar
- **Aprovação Manual** - Você decide quando aplicar
- **Snapshots Automáticos** - Backup antes de cada mudança
- **Rollback com 1 Clique** - Reverta se não funcionar

### 4. **Histórico Completo**
- Todas as análises realizadas
- Status de cada correção
- Logs detalhados
- Snapshots salvos

## 🚀 Como Usar

### 1. Configurar Provider de IA

Acesse: **Configurações → IA Debug → Configurar IA**

1. Escolha o provider (Lovable AI é recomendado e gratuito)
2. Selecione o modelo
3. Se necessário, adicione API key
4. Defina como padrão

### 2. Analisar Erro

Na aba **Nova Análise**:

1. Cole a mensagem de erro
2. Cole o stack trace (opcional)
3. Clique em "Analisar com IA"
4. Aguarde a análise (15-30 segundos)

### 3. Revisar Correções

A IA retorna:
- **Causa Raiz** - O que causou o erro
- **Correções Sugeridas** - Ordenadas por prioridade
- **Preview do Código** - Veja exatamente o que será mudado

### 4. Aplicar Correção

1. Expanda a correção desejada
2. Revise o código sugerido
3. Clique em "Aplicar Correção"
4. Sistema cria snapshot automaticamente
5. Correção é aplicada

### 5. Reverter (se necessário)

Se a correção não funcionar:
1. Clique em "Reverter Correção"
2. Código volta ao estado anterior
3. Tente outra correção sugerida

## 📊 Tabelas do Banco

### `error_analyses`
Armazena cada análise de erro realizada

### `fix_suggestions`
Correções sugeridas pela IA

### `code_snapshots`
Snapshots do código para rollback

### `ai_provider_configs`
Configuração dos providers de IA

## 🔧 Edge Functions

### `ai-analyze-error`
Analisa erro usando IA configurada

### `apply-fix`
Aplica correção e cria snapshot

### `rollback-fix`
Reverte correção usando snapshot

## 🎯 Workflow Completo

```
Erro detectado
    ↓
Cole no painel IA Debug
    ↓
IA analisa (15-30s)
    ↓
3-5 correções sugeridas
    ↓
Revise e escolha uma
    ↓
Snapshot automático criado
    ↓
Correção aplicada
    ↓
Funciona? ✅ Pronto!
         ❌ Rollback + tente outra
```

## 💡 Dicas

1. **Seja Específico** - Quanto mais contexto, melhor a análise
2. **Stack Trace Completo** - Ajuda muito na análise
3. **Teste Incrementalmente** - Aplique uma correção por vez
4. **Use Snapshots** - Sempre crie antes de aplicar
5. **Gemini Flash** - Melhor custo-benefício (padrão)

## 🔐 Segurança

- API keys armazenadas com segurança no Supabase
- RLS políticas protegem dados por usuário
- Snapshots isolados por usuário
- Edge functions com autenticação

## 🆘 Solução de Problemas

**"IA não está analisando"**
- Verifique se tem provider configurado
- Confirme que API key é válida (se necessário)

**"Correção não funcionou"**
- Use o rollback imediatamente
- Tente outra correção sugerida
- Reanalise com mais contexto

**"Lovable AI quota exceeded"**
- Aguarde reset mensal OU
- Configure OpenAI/Gemini com sua API key

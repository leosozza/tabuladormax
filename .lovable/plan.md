
# Criar Página AI Playground

## Problema Identificado

A rota `/admin/ai-playground` está configurada no menu do AdminHub (linha 225-231) com o título "Playground IA" e descrição "Testar e experimentar modelos de IA", porém:

- O componente da página não existe
- A rota não está registrada no `App.tsx`

## Solução

Criar uma página de Playground de IA que permite testar os modelos disponíveis no Lovable AI.

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/admin/AIPlayground.tsx` | **Criar** - Componente da página |
| `src/App.tsx` | **Modificar** - Adicionar rota |

---

## Funcionalidades do Playground

### Interface Principal

1. **Seletor de Modelo** - Dropdown com modelos disponíveis:
   - google/gemini-2.5-pro
   - google/gemini-2.5-flash
   - google/gemini-2.5-flash-lite
   - google/gemini-3-pro-preview
   - google/gemini-3-flash-preview
   - openai/gpt-5
   - openai/gpt-5-mini
   - openai/gpt-5-nano
   - openai/gpt-5.2

2. **Área de Prompt** - Textarea para digitar o prompt de teste

3. **Parâmetros Opcionais**:
   - Temperature (slider 0-1)
   - Max Tokens (input numérico)
   - System Prompt (textarea opcional)

4. **Botão Enviar** - Envia o prompt para o modelo selecionado

5. **Área de Resposta** - Exibe a resposta do modelo com:
   - Conteúdo formatado (markdown)
   - Tempo de resposta
   - Tokens utilizados (se disponível)

6. **Histórico** - Lista das últimas interações da sessão

---

## Estrutura do Componente

```text
┌──────────────────────────────────────────────────────────────┐
│  🧪 Playground IA                                            │
│  Testar e experimentar modelos de IA                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐   │
│  │ Modelo                  │  │ Temperature: 0.7        │   │
│  │ [google/gemini-2.5-pro▼]│  │ ═══════●════════════    │   │
│  └─────────────────────────┘  └─────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ System Prompt (opcional)                              │   │
│  │ ┌──────────────────────────────────────────────────┐ │   │
│  │ │ Você é um assistente...                          │ │   │
│  │ └──────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Prompt                                                │   │
│  │ ┌──────────────────────────────────────────────────┐ │   │
│  │ │ Explique o que é machine learning...             │ │   │
│  │ │                                                  │ │   │
│  │ └──────────────────────────────────────────────────┘ │   │
│  │                                    [🚀 Enviar]       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Resposta                                 ⏱️ 1.2s    │   │
│  │ ┌──────────────────────────────────────────────────┐ │   │
│  │ │ Machine learning é uma área da inteligência     │ │   │
│  │ │ artificial que permite que sistemas...          │ │   │
│  │ │                                                  │ │   │
│  │ └──────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Detalhes Técnicos

### 1. Criar `src/pages/admin/AIPlayground.tsx`

O componente irá:
- Usar `AdminPageLayout` para consistência visual
- Chamar uma edge function para processar as requisições de IA
- Manter estado local do histórico de conversas
- Suportar markdown na renderização das respostas

### 2. Criar ou reutilizar Edge Function

Verificar se já existe uma edge function para chat com IA, ou criar uma específica para o playground que:
- Recebe: modelo, prompt, systemPrompt, temperature
- Retorna: resposta do modelo, tempo de execução

### 3. Modificar `src/App.tsx`

Adicionar a rota:
```tsx
import AIPlayground from './pages/admin/AIPlayground';

// Na lista de rotas administrativas:
<Route path="/admin/ai-playground" element={<ProtectedRoute requireAdmin><AIPlayground /></ProtectedRoute>} />
```

---

## Benefícios

1. **Teste rápido** - Administradores podem testar prompts antes de usar em produção
2. **Comparação de modelos** - Facilita escolher o modelo ideal para cada caso
3. **Debug** - Ajuda a entender comportamentos inesperados do AI
4. **Documentação viva** - Serve como referência dos modelos disponíveis

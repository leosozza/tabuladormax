
# Plano: Corrigir Salvamento de Treinamentos por Conversa

## Problema Identificado

Detectei **dois problemas** que impedem a visualização do treinamento gerado:

### 1. Categoria 'conversas' não existe nos mapeamentos da interface
O `ConversationTrainingGenerator.tsx` salva treinamentos com `category: 'conversas'`, mas essa categoria não existe em:
- `AIAgentTrainingList.tsx` → `CATEGORY_LABELS` e `CATEGORY_COLORS`
- `AIAgentTrainingFormDialog.tsx` → `CATEGORIES`

Isso faz com que treinamentos com essa categoria não exibam a badge corretamente.

### 2. RLS pode bloquear INSERT para usuários não-admin
A política `"Admins can manage ai_agents_training"` exige `has_role(auth.uid(), 'admin')`. Se o usuário logado não tiver essa role, o INSERT falha silenciosamente (sem erro visível no frontend).

**Evidência**: O edge function retornou sucesso (`✅ Treinamento gerado com sucesso usando Cerebras`), mas não há treinamentos com categoria 'conversas' no banco.

## Alterações Necessárias

### Arquivo 1: `src/components/admin/ai-agents/AIAgentTrainingList.tsx`
Adicionar categoria `'conversas'` aos mapeamentos:

```typescript
const CATEGORY_LABELS: Record<string, string> = {
  saudacao: 'Saudação',
  produtos: 'Produtos',
  objecoes: 'Objeções',
  fechamento: 'Fechamento',
  faq: 'FAQ',
  geral: 'Geral',
  conversas: 'Conversas',  // ← NOVO
};

const CATEGORY_COLORS: Record<string, string> = {
  // ... existentes ...
  conversas: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',  // ← NOVO
};
```

### Arquivo 2: `src/components/admin/ai-agents/AIAgentTrainingFormDialog.tsx`
Adicionar categoria ao seletor:

```typescript
const CATEGORIES = [
  // ... existentes ...
  { value: 'conversas', label: 'Conversas', description: 'Gerado a partir de conversas de operadores' },
];
```

### Arquivo 3: `src/components/admin/ai-agents/ConversationTrainingGenerator.tsx`
Melhorar tratamento de erros no `handleSave`:

```typescript
const handleSave = async () => {
  // ... validações existentes ...

  try {
    const { data, error } = await supabase.from('ai_agents_training').insert({...}).select();

    if (error) throw error;
    
    if (!data || data.length === 0) {
      toast.error('Erro ao salvar: verifique suas permissões de administrador');
      return;
    }

    toast.success('Treinamento salvo com sucesso!');
    // ... limpar estado ...
  } catch (err: any) {
    console.error('Erro ao salvar treinamento:', err);
    if (err?.code === '42501') {
      toast.error('Sem permissão para salvar. Contate um administrador.');
    } else {
      toast.error('Erro ao salvar treinamento');
    }
  } finally {
    setIsSaving(false);
  }
};
```

## Resumo das Alterações

| Arquivo | Mudança |
|---------|---------|
| `AIAgentTrainingList.tsx` | Adicionar 'conversas' em `CATEGORY_LABELS` e `CATEGORY_COLORS` |
| `AIAgentTrainingFormDialog.tsx` | Adicionar 'conversas' no array `CATEGORIES` |
| `ConversationTrainingGenerator.tsx` | Melhorar tratamento de erros + usar `.select()` para detectar falhas de RLS |

## Resultado Esperado

1. Treinamentos salvos com categoria 'conversas' aparecerão com badge amarela
2. Erros de permissão serão exibidos claramente ao usuário
3. O usuário saberá se precisa contatar um administrador para obter permissões

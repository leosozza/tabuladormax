

# Correção: Persistência de Dados no Formulário de Cadastro

## Problema Principal
Quando o cliente preenche o formulário e ocorre qualquer erro no envio, **todos os dados digitados são perdidos**. Isso é crítico porque o cliente precisa preencher tudo novamente.

## Solução: Auto-save com localStorage

### Como vai funcionar:
1. **Salvar automaticamente** a cada vez que o cliente digitar algo (com delay de 500ms para não sobrecarregar)
2. **Ao reabrir a página** com dados salvos, mostrar opção de restaurar
3. **Limpar os dados salvos** apenas quando o envio for bem-sucedido
4. **Expiração automática** de dados com mais de 24 horas

### Fluxo do Usuário Após Correção:

```text
1. Cliente abre /cadastro?deal=61028
   ↓
2. Sistema verifica localStorage
   ↓
3. [Se houver dados salvos] → Mostrar toast:
   "Encontramos dados não salvos. Deseja restaurar?"
   [Restaurar] [Descartar]
   ↓
4. Cliente preenche/edita campos
   ↓ (auto-save a cada mudança - 500ms debounce)
5. Dados salvos no localStorage automaticamente
   ↓
6. Cliente clica "Salvar"
   ↓
7. [Se ERRO] → Mostra erro + DADOS PRESERVADOS
              → Cliente corrige e tenta novamente
   ↓
8. [Se SUCESSO] → Deal atualizado no Bitrix
               → Etapa muda para UC_O2KDK6 (Ficha Preenchida)
               → localStorage limpo
               → Redireciona para /cadastro/sucesso
```

---

## Implementação Técnica

### Arquivo: `src/pages/cadastro/CadastroFicha.tsx`

### 1. Adicionar constantes para localStorage
```typescript
const STORAGE_KEY_PREFIX = 'cadastro_form_data_';
const STORAGE_EXPIRY_HOURS = 24;

const getStorageKey = () => {
  if (bitrixEntityType && bitrixEntityId) {
    return `${STORAGE_KEY_PREFIX}${bitrixEntityType}_${bitrixEntityId}`;
  }
  return `${STORAGE_KEY_PREFIX}new`;
};
```

### 2. Função para salvar no localStorage
```typescript
const saveToLocalStorage = (data: FormData) => {
  const key = getStorageKey();
  const payload = {
    timestamp: new Date().toISOString(),
    data: data
  };
  localStorage.setItem(key, JSON.stringify(payload));
};
```

### 3. Função para restaurar do localStorage
```typescript
const getFromLocalStorage = (): FormData | null => {
  const key = getStorageKey();
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  
  try {
    const parsed = JSON.parse(stored);
    const timestamp = new Date(parsed.timestamp);
    const hoursDiff = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60);
    
    // Expirar dados com mais de 24h
    if (hoursDiff > STORAGE_EXPIRY_HOURS) {
      localStorage.removeItem(key);
      return null;
    }
    
    return parsed.data;
  } catch {
    return null;
  }
};
```

### 4. useEffect para auto-save (debounce 500ms)
```typescript
useEffect(() => {
  // Não salvar durante loading inicial ou se não tiver ID
  if (isLoadingData || !hasLoadedInitialData) return;
  
  const timeoutId = setTimeout(() => {
    saveToLocalStorage(formData);
  }, 500);
  
  return () => clearTimeout(timeoutId);
}, [formData, isLoadingData, hasLoadedInitialData]);
```

### 5. Verificar dados salvos ao carregar
```typescript
useEffect(() => {
  if (hasLoadedInitialData && bitrixEntityId) {
    const savedData = getFromLocalStorage();
    if (savedData) {
      toast({
        title: 'Dados não salvos encontrados',
        description: 'Encontramos dados que você preencheu anteriormente.',
        action: (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => {
              setFormData(savedData);
              toast({ title: 'Dados restaurados!' });
            }}>
              Restaurar
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              clearLocalStorage();
              toast({ title: 'Dados descartados' });
            }}>
              Descartar
            </Button>
          </div>
        )
      });
    }
  }
}, [hasLoadedInitialData, bitrixEntityId]);
```

### 6. Limpar localStorage apenas no sucesso
No `handleSubmit`, após sucesso:
```typescript
// Linha ~1096-1098
setSubmitStatus('Concluído!');

// ✅ LIMPAR localStorage apenas no sucesso
const storageKey = getStorageKey();
localStorage.removeItem(storageKey);

setTimeout(() => {
  navigate('/cadastro/sucesso');
}, 300);
```

---

## Estrutura dos Dados Salvos

```json
{
  "cadastro_form_data_deal_61028": {
    "timestamp": "2026-01-28T14:30:00Z",
    "data": {
      "nomeResponsavel": "Elaine",
      "telefoneResponsavel": "+5511970132425",
      "nomeModelo": "Luisa vitoria da silva Porto altino",
      "cpf": "123.456.789-00",
      ...
    }
  }
}
```

---

## Testes de Validação

Após implementação, verificar:

| Cenário | Resultado Esperado |
|---------|-------------------|
| Preencher form, dar erro no envio | Dados preservados, pode tentar novamente |
| Preencher form, fechar aba, reabrir | Toast perguntando se quer restaurar |
| Preencher form, recarregar página (F5) | Toast perguntando se quer restaurar |
| Salvar com sucesso | localStorage limpo, redireciona para sucesso |
| Dados com mais de 24h | Ignorados automaticamente |

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/cadastro/CadastroFicha.tsx` | Adicionar toda a lógica de localStorage |

---

## Benefícios

1. **Sem perda de dados** - Mesmo com erro de rede ou servidor
2. **Experiência melhor** - Cliente não precisa preencher tudo novamente
3. **Recuperação automática** - Se fechar o navegador por engano
4. **Limpeza automática** - Dados antigos (>24h) são descartados


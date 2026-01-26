
# Refresh Automático de Token e Validação Pré-Envio

## Problema Atual

O sistema atual tem `autoRefreshToken: true` no cliente Supabase, mas isso não é suficiente porque:

1. **Token pode expirar entre refreshes** - O refresh automático ocorre em intervalos, não garante token válido no momento exato do envio
2. **Operador inativo** - Se o operador ficou inativo por muito tempo, a sessão pode ter expirado completamente
3. **Refresh silencioso falha** - O hook `useWhatsAppMessages` tenta refresh, mas só DEPOIS de uma falha (tarde demais)

## Solução Proposta

### Estratégia: Validação Proativa + Bloqueio de Envio

```text
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DE ENVIO DE MENSAGEM                   │
├─────────────────────────────────────────────────────────────────┤
│  1. Operador clica "Enviar"                                     │
│                    ↓                                            │
│  2. Verificar sessão: supabase.auth.getSession()                │
│                    ↓                                            │
│  3. Token válido?                                               │
│       ├── SIM → Continuar envio normalmente                     │
│       └── NÃO → Tentar refresh automático                       │
│                    ↓                                            │
│  4. Refresh funcionou?                                          │
│       ├── SIM → Continuar envio normalmente                     │
│       └── NÃO → Tentar re-auth com access_key                   │
│                    ↓                                            │
│  5. Re-auth funcionou?                                          │
│       ├── SIM → Continuar envio normalmente                     │
│       └── NÃO → BLOQUEAR ENVIO + Mostrar modal de login         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Alterações Técnicas

### 1. Novo Hook: `useSessionGuard`

Criar um hook dedicado para gerenciar a validade da sessão:

**Arquivo:** `src/hooks/useSessionGuard.ts`

```typescript
export function useSessionGuard() {
  const [isSessionValid, setIsSessionValid] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showReloginModal, setShowReloginModal] = useState(false);
  
  // Verificar e garantir sessão válida
  const ensureValidSession = async (): Promise<boolean> => {
    // 1. Checar sessão atual
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.expires_at) {
      const expiresAt = session.expires_at * 1000;
      const now = Date.now();
      const bufferMs = 60 * 1000; // 1 minuto de margem
      
      if (expiresAt - now > bufferMs) {
        return true; // Sessão válida
      }
    }
    
    // 2. Tentar refresh
    const { data: refreshData } = await supabase.auth.refreshSession();
    if (refreshData?.session) {
      return true;
    }
    
    // 3. Tentar re-auth via access_key
    const authStatus = localStorage.getItem('telemarketing_auth_status');
    if (authStatus) {
      const { email, accessKey } = JSON.parse(authStatus);
      const { error } = await supabase.auth.signInWithPassword({ email, password: accessKey });
      if (!error) {
        return true;
      }
    }
    
    // 4. Falhou - mostrar modal de relogin
    setShowReloginModal(true);
    return false;
  };
  
  return { isSessionValid, isRefreshing, showReloginModal, ensureValidSession, setShowReloginModal };
}
```

### 2. Modal de Re-login

Criar um modal que aparece quando a sessão não pode ser recuperada automaticamente:

**Arquivo:** `src/components/whatsapp/SessionExpiredModal.tsx`

```typescript
export function SessionExpiredModal({ open, onRelogin }: Props) {
  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sessão Expirada</DialogTitle>
          <DialogDescription>
            Sua sessão expirou e não foi possível reconectar automaticamente.
            Clique no botão abaixo para fazer login novamente.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onRelogin}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Fazer Login Novamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 3. Atualizar `useWhatsAppMessages`

Modificar o hook para validar sessão ANTES de enviar:

**Arquivo:** `src/hooks/useWhatsAppMessages.ts`

Mudanças:
- Adicionar verificação de sessão no início de `sendMessage()`
- Se sessão inválida e não recuperável, retornar erro específico
- Expor flag `sessionExpired` para o componente pai

```typescript
// Dentro de sendMessage():
const sendMessage = async (content: string): Promise<boolean> => {
  // NOVO: Validar sessão ANTES de tentar enviar
  const sessionValid = await ensureValidSession();
  if (!sessionValid) {
    setLastSendError({
      message: 'Sessão expirada. Faça login novamente para enviar mensagens.',
      code: 'session_expired',
      canRetry: false,
      requiresReconnect: true,
      timestamp: Date.now(),
    });
    return false;
  }
  
  // ... resto do código de envio
};
```

### 4. Atualizar `WhatsAppChatContainer`

Integrar o modal de relogin:

**Arquivo:** `src/components/whatsapp/WhatsAppChatContainer.tsx`

```tsx
import { SessionExpiredModal } from './SessionExpiredModal';

// Dentro do componente:
const [showReloginModal, setShowReloginModal] = useState(false);

// Handler para relogin
const handleRelogin = () => {
  // Limpar dados de sessão
  localStorage.removeItem('telemarketing_auth_status');
  // Redirecionar para login
  window.location.href = '/portal-telemarketing';
};

// Detectar erro de sessão expirada do hook
useEffect(() => {
  if (lastSendError?.code === 'session_expired') {
    setShowReloginModal(true);
  }
}, [lastSendError]);

// No JSX:
<SessionExpiredModal 
  open={showReloginModal} 
  onRelogin={handleRelogin} 
/>
```

---

## Monitor de Sessão em Background

Adicionar um timer que verifica a validade da sessão periodicamente:

```typescript
// Em useSessionGuard:
useEffect(() => {
  const checkInterval = setInterval(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.expires_at) {
      const expiresAt = session.expires_at * 1000;
      const now = Date.now();
      const warnThreshold = 5 * 60 * 1000; // 5 minutos
      
      if (expiresAt - now < warnThreshold && expiresAt - now > 0) {
        // Sessão expirando em breve - fazer refresh proativo
        await supabase.auth.refreshSession();
      }
    }
  }, 60 * 1000); // Checar a cada 1 minuto
  
  return () => clearInterval(checkInterval);
}, []);
```

---

## Fluxo Visual para o Operador

```text
┌─────────────────────────────────────────────────────────────────┐
│  CENÁRIO: Operador com sessão expirada tenta enviar mensagem   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Operador digita mensagem e clica "Enviar"                   │
│                                                                 │
│  2. Sistema detecta sessão expirada                             │
│     ↓                                                           │
│  3. Tenta refresh automático (invisível para operador)          │
│     ↓                                                           │
│  4. Se refresh falhar:                                          │
│     ┌─────────────────────────────────────────┐                 │
│     │  ⚠️ Sessão Expirada                     │                 │
│     │                                         │                 │
│     │  Sua sessão expirou e não foi possível  │                 │
│     │  reconectar automaticamente.            │                 │
│     │                                         │                 │
│     │  [ Fazer Login Novamente ]              │                 │
│     └─────────────────────────────────────────┘                 │
│                                                                 │
│  5. Operador clica no botão → Redirecionado para login          │
│                                                                 │
│  6. Após login, volta para onde estava (preservar contexto)     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/hooks/useSessionGuard.ts` | Criar novo |
| `src/components/whatsapp/SessionExpiredModal.tsx` | Criar novo |
| `src/hooks/useWhatsAppMessages.ts` | Modificar (adicionar validação pré-envio) |
| `src/components/whatsapp/WhatsAppChatContainer.tsx` | Modificar (integrar modal) |

---

## Benefícios

1. **Prevenção** - Valida sessão ANTES de tentar enviar, evitando erros
2. **Automático** - Tenta recuperar sessão automaticamente em background
3. **Transparente** - Operador só é interrompido quando realmente necessário
4. **Contexto preservado** - Mensagem digitada não é perdida
5. **UX clara** - Modal explica exatamente o que aconteceu e o que fazer

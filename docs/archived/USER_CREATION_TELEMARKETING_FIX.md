# Correção do Fluxo de Criação de Usuário e Mapeamento de Telemarketing

## Resumo Executivo

Este documento descreve as correções implementadas para garantir a criação consistente do mapeamento entre usuários e operadores de telemarketing do Bitrix24, resolvendo problemas críticos de permissões RLS e validação de dados.

## Problemas Identificados

### 1. **CRÍTICO: Políticas RLS Restritivas**
A política RLS na tabela `agent_telemarketing_mapping` só permitia que admins e managers criassem registros, bloqueando usuários comuns de criar seus próprios mapeamentos durante o cadastro.

```sql
-- ❌ POLÍTICA ANTIGA (PROBLEMA)
CREATE POLICY "Admins and managers can manage mappings"
  ON public.agent_telemarketing_mapping
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
```

### 2. Validação Incompleta
- Falta de validação de parâmetros na função `createAgentMapping`
- Validação insuficiente do `telemarketing_id` em metadados do usuário
- Ausência de validação antes de operações críticas

### 3. Tratamento de Erros Limitado
- Apenas erro 23505 (duplicata) era tratado especificamente
- Erros de permissão (42501) não eram identificados
- Falta de feedback específico ao usuário sobre diferentes tipos de erro
- Logs insuficientes para diagnóstico

### 4. Criação de Mapeamento Inconsistente
- Mapeamento não era criado imediatamente após signup
- Falta de tentativa de criação em alguns fluxos (OAuth redirecionado)
- Sem garantia de criação em todos os pontos de entrada

## Soluções Implementadas

### 1. Nova Estrutura de Políticas RLS

#### Migration: `20251014171900_fix_agent_telemarketing_mapping_rls.sql`

```sql
-- ✅ POLÍTICA CORRIGIDA
-- Permite INSERT para o próprio usuário
CREATE POLICY "Users can create their own mapping"
  ON public.agent_telemarketing_mapping
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (tabuladormax_user_id = auth.uid())  -- Usuário pode criar para si mesmo
    OR
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- Usuários veem apenas seus próprios mapeamentos
CREATE POLICY "Users can view own mapping, admins view all"
  ON public.agent_telemarketing_mapping
  FOR SELECT
  TO authenticated
  USING (
    (tabuladormax_user_id = auth.uid())
    OR
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- Apenas admins/managers podem UPDATE/DELETE
CREATE POLICY "Admins and managers can update mappings" ...
CREATE POLICY "Admins and managers can delete mappings" ...
```

**Impacto:**
- ✅ Usuários podem criar seus próprios mapeamentos durante signup
- ✅ Mantém controle administrativo para operações de manutenção
- ✅ Isola dados entre usuários (privacidade)

### 2. Validação Robusta na Função `createAgentMapping`

#### Antes:
```typescript
const createAgentMapping = async (userId: string, tmId: number): Promise<boolean> => {
  try {
    const { data: existingMapping } = await supabase
      .from('agent_telemarketing_mapping')
      .select('id')
      .eq('tabuladormax_user_id', userId)
      .maybeSingle();
    // ... resto do código sem validação de entrada
  }
}
```

#### Depois:
```typescript
const createAgentMapping = async (userId: string, tmId: number): Promise<boolean> => {
  try {
    // ✅ NOVA: Validação de entrada
    if (!userId || !tmId || !Number.isInteger(tmId) || tmId <= 0) {
      console.error('❌ Parâmetros inválidos:', { userId, tmId });
      toast.error('Erro: Parâmetros inválidos para criar mapeamento de agente');
      return false;
    }

    // ✅ NOVA: Tratamento de erro na verificação
    const { data: existingMapping, error: checkError } = await supabase
      .from('agent_telemarketing_mapping')
      .select('id')
      .eq('tabuladormax_user_id', userId)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Erro ao verificar mapeamento:', checkError);
      toast.error(`Erro ao verificar mapeamento: ${checkError.message}`);
      return false;
    }

    // ... resto do código
  }
}
```

**Validações Adicionadas:**
- ✅ `userId` não pode ser vazio
- ✅ `tmId` deve ser número inteiro positivo
- ✅ Erros de consulta são capturados e tratados
- ✅ Cache errors não bloqueiam a operação (degradação graciosa)

### 3. Tratamento de Erros Específico

```typescript
if (mappingError) {
  // ✅ Duplicata - considerado sucesso
  if (mappingError.code === '23505') {
    console.log('✅ Mapeamento já existe (constraint)');
    return true;
  }
  
  // ✅ NOVO: Log detalhado
  console.error('❌ Erro ao criar mapeamento:', {
    code: mappingError.code,
    message: mappingError.message,
    details: mappingError.details,
    hint: mappingError.hint,
  });
  
  // ✅ NOVO: Mensagens específicas por código
  if (mappingError.code === '42501') {
    toast.error('Erro de permissão: Você não tem permissão para criar o mapeamento. Contate o administrador.');
  } else if (mappingError.code === '23503') {
    toast.error('Erro: Referência inválida. Verifique se o usuário existe.');
  } else {
    toast.error(`Erro ao criar mapeamento de agente: ${mappingError.message}`);
  }
  
  return false;
}
```

**Códigos de Erro Tratados:**
- `23505`: Violação de constraint única (duplicata) → Tratado como sucesso
- `42501`: Permissão negada → Mensagem específica ao usuário
- `23503`: Violação de foreign key → Mensagem de referência inválida
- Outros: Mensagem genérica com detalhes do erro

### 4. Garantia de Criação em Todos os Fluxos

#### A. Fluxo de Signup (Registro Manual)
```typescript
const handleSignUp = async (e: React.FormEvent) => {
  // ... validação e signup ...
  
  // ✅ NOVO: Criar mapeamento imediatamente após signup
  if (data.user?.id) {
    console.log('📝 Criando mapeamento de agente após signup bem-sucedido');
    const mappingSuccess = await createAgentMapping(data.user.id, telemarketingId);
    
    if (!mappingSuccess) {
      console.warn('⚠️ Falha ao criar mapeamento durante signup');
      toast.warning("Conta criada, mas houve um problema ao criar o mapeamento de agente.");
    } else {
      toast.success("Conta criada com sucesso!");
    }
  }
}
```

#### B. Fluxo de Login
```typescript
const handleSignIn = async (e: React.FormEvent) => {
  // ... login ...
  
  // ✅ MELHORADO: Validação antes de criar mapeamento
  if (user?.user_metadata?.telemarketing_id) {
    const telemarketingIdFromMetadata = user.user_metadata.telemarketing_id;
    
    // ✅ NOVO: Validar telemarketing_id dos metadados
    if (Number.isInteger(telemarketingIdFromMetadata) && telemarketingIdFromMetadata > 0) {
      console.log('📝 Verificando/criando mapeamento após login');
      const success = await createAgentMapping(user.id, telemarketingIdFromMetadata);
      
      if (!success) {
        toast.warning("Login realizado, mas houve um problema ao criar o mapeamento de agente");
      }
    } else {
      console.warn('⚠️ telemarketing_id inválido nos metadados:', telemarketingIdFromMetadata);
    }
  }
}
```

#### C. Fluxo OAuth
```typescript
const handleCompleteTelemarketingSetup = async () => {
  // ✅ NOVO: Validação obrigatória
  if (!telemarketingId || !Number.isInteger(telemarketingId) || telemarketingId <= 0) {
    toast.error("Por favor, selecione um operador de telemarketing válido");
    return;
  }
  
  // ✅ NOVO: Logs detalhados
  console.log('📝 Completando setup de telemarketing para usuário OAuth:', user.id);
  
  // Atualizar metadados
  const { error: updateError } = await supabase.auth.updateUser({
    data: { telemarketing_id: telemarketingId },
  });
  
  if (updateError) {
    console.error('❌ Erro ao atualizar metadados:', updateError);
    throw updateError;
  }
  
  console.log('✅ Metadados atualizados com telemarketing_id');
  
  // Criar mapeamento
  const success = await createAgentMapping(user.id, telemarketingId);
  // ...
}
```

#### D. useEffect (Verificação ao Carregar Página)
```typescript
useEffect(() => {
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (session?.user) {
      console.log('🔍 Verificando sessão do usuário:', session.user.id);
      
      if (!session.user.user_metadata?.telemarketing_id) {
        console.log('⚠️ Usuário OAuth sem telemarketing_id, mostrando modal');
        setOauthUser(session.user);
        setShowTelemarketingModal(true);
      } else {
        const telemarketingId = session.user.user_metadata.telemarketing_id;
        console.log('✅ Usuário tem telemarketing_id:', telemarketingId);
        
        // ✅ NOVO: Garantir que mapeamento existe
        if (Number.isInteger(telemarketingId) && telemarketingId > 0) {
          await createAgentMapping(session.user.id, telemarketingId);
        }
        
        navigate("/");
      }
    }
  });
}, [navigate]);
```

### 5. Testes Automatizados

Criados 16 testes unitários cobrindo:

#### Validação de telemarketingId
- ✅ Rejeita null/undefined
- ✅ Rejeita zero
- ✅ Rejeita números negativos
- ✅ Rejeita decimais
- ✅ Rejeita valores não-numéricos
- ✅ Aceita inteiros positivos válidos

#### Tratamento de Códigos de Erro
- ✅ Mensagem específica para 42501 (permissão)
- ✅ Mensagem específica para 23503 (referência)
- ✅ Tratamento de 23505 (duplicata)
- ✅ Mensagem genérica para erros desconhecidos

#### Validação de Metadados
- ✅ Rejeita metadados ausentes
- ✅ Rejeita telemarketing_id inválido
- ✅ Aceita telemarketing_id válido

#### Validação de Parâmetros de Mapeamento
- ✅ Rejeita userId ausente
- ✅ Rejeita telemarketing_id inválido
- ✅ Aceita parâmetros válidos

**Resultado:**
```
Test Files  10 passed (10)
Tests  172 passed (172)  ← 156 existentes + 16 novos
```

## Impacto das Mudanças

### Segurança
- ✅ Usuários podem criar apenas seus próprios mapeamentos
- ✅ Isolamento de dados entre usuários
- ✅ Admins/managers mantêm controle total

### Confiabilidade
- ✅ Mapeamento garantido em todos os fluxos (signup, login, OAuth)
- ✅ Validação robusta previne dados inválidos
- ✅ Tratamento gracioso de erros (não bloqueia operação principal)

### Observabilidade
- ✅ Logs detalhados em console para diagnóstico
- ✅ Feedback específico ao usuário sobre problemas
- ✅ Diferenciação clara entre tipos de erro

### Qualidade
- ✅ Cobertura de testes para lógica crítica
- ✅ Sem warnings de lint
- ✅ Tipos TypeScript adequados (sem `any`)

## Fluxogramas

### Fluxo de Signup
```
┌─────────────────────┐
│ Usuário preenche    │
│ formulário          │
│ (incluindo TM ID)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Validar TM ID       │
│ (>0, integer)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ auth.signUp()       │
│ com metadata        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ createAgentMapping()│
│ (userId, tmId)      │
└──────────┬──────────┘
           │
           ├─────────────────┐
           │                 │
           ▼                 ▼
     ┌─────────┐      ┌──────────┐
     │ Sucesso │      │  Erro    │
     │ ou já   │      │ (log +   │
     │ existe  │      │ toast)   │
     └────┬────┘      └─────┬────┘
          │                 │
          └────────┬────────┘
                   ▼
            ┌─────────────┐
            │ Navegação   │
            │ ou feedback │
            └─────────────┘
```

### Fluxo de Login
```
┌─────────────────────┐
│ auth.signIn()       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Buscar metadados    │
│ do usuário          │
└──────────┬──────────┘
           │
           ├──────────────────┐
           │                  │
           ▼                  ▼
   ┌──────────────┐   ┌──────────────┐
   │ TM ID existe │   │ TM ID ausente│
   │ nos metadata │   │              │
   └──────┬───────┘   └──────┬───────┘
          │                  │
          ▼                  ▼
   ┌──────────────┐   ┌──────────────┐
   │ Validar TM ID│   │ Navegação    │
   │ (integer>0)  │   │ normal       │
   └──────┬───────┘   └──────────────┘
          │
          ▼
   ┌──────────────┐
   │ createAgent  │
   │ Mapping()    │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │ Navegação    │
   │ (com/sem     │
   │ warning)     │
   └──────────────┘
```

### Fluxo OAuth
```
┌─────────────────────┐
│ OAuth redirect      │
│ de Google           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ useEffect detecta   │
│ sessão OAuth        │
└──────────┬──────────┘
           │
           ├──────────────────┐
           │                  │
           ▼                  ▼
   ┌──────────────┐   ┌──────────────┐
   │ TM ID existe │   │ TM ID ausente│
   │ nos metadata │   │              │
   └──────┬───────┘   └──────┬───────┘
          │                  │
          ▼                  ▼
   ┌──────────────┐   ┌──────────────┐
   │ createAgent  │   │ Modal de     │
   │ Mapping()    │   │ seleção TM   │
   └──────┬───────┘   └──────┬───────┘
          │                  │
          │                  ▼
          │           ┌──────────────┐
          │           │ Usuário      │
          │           │ seleciona TM │
          │           └──────┬───────┘
          │                  │
          │                  ▼
          │           ┌──────────────┐
          │           │ updateUser() │
          │           │ + create     │
          │           │ Mapping()    │
          │           └──────┬───────┘
          │                  │
          └──────────┬───────┘
                     ▼
              ┌─────────────┐
              │ Navegação   │
              │ para home   │
              └─────────────┘
```

## Checklist de Implantação

### Pré-Deploy
- [x] Todos os testes passam (172/172)
- [x] Sem warnings de lint
- [x] Migration SQL validada
- [x] Documentação criada

### Deploy
- [ ] Aplicar migration SQL no ambiente de produção
- [ ] Monitorar logs de erro por 24h
- [ ] Verificar taxa de sucesso de criação de mapeamentos
- [ ] Testar fluxos manualmente:
  - [ ] Signup com telemarketing válido
  - [ ] Signup tentando usar telemarketing inválido
  - [ ] Login de usuário existente
  - [ ] OAuth (Google) sem telemarketing
  - [ ] OAuth (Google) com telemarketing existente

### Pós-Deploy
- [ ] Verificar logs de console (buscar por ❌ e ⚠️)
- [ ] Monitorar feedbacks de usuários
- [ ] Verificar se há usuários sem mapeamento
- [ ] Criar runbook para troubleshooting

## Troubleshooting

### Problema: Usuário não consegue criar mapeamento

**Sintomas:**
- Toast: "Erro de permissão: Você não tem permissão para criar o mapeamento"
- Console: `❌ Erro ao criar mapeamento: code: 42501`

**Diagnóstico:**
```sql
-- Verificar políticas RLS
SELECT * FROM pg_policies 
WHERE tablename = 'agent_telemarketing_mapping';

-- Verificar se migration foi aplicada
SELECT * FROM supabase_migrations 
WHERE name LIKE '%fix_agent_telemarketing_mapping_rls%';
```

**Solução:**
1. Aplicar migration `20251014171900_fix_agent_telemarketing_mapping_rls.sql`
2. Verificar que política "Users can create their own mapping" existe

### Problema: Mapeamento duplicado

**Sintomas:**
- Console: `✅ Mapeamento já existe (constraint)`
- Operação continua normalmente

**Diagnóstico:**
```sql
-- Verificar mapeamentos do usuário
SELECT * FROM agent_telemarketing_mapping 
WHERE tabuladormax_user_id = '<user_id>';
```

**Solução:**
- Isso é esperado e tratado graciosamente
- Nenhuma ação necessária

### Problema: telemarketing_id inválido em metadados

**Sintomas:**
- Console: `⚠️ telemarketing_id inválido nos metadados`
- Login funciona, mas mapeamento não é criado

**Diagnóstico:**
```sql
-- Verificar metadados do usuário
SELECT raw_user_meta_data 
FROM auth.users 
WHERE id = '<user_id>';
```

**Solução:**
1. Corrigir metadados manualmente:
```sql
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data, 
  '{telemarketing_id}', 
  '<valid_id>'::jsonb
)
WHERE id = '<user_id>';
```
2. Usuário faz login novamente
3. Mapeamento será criado automaticamente

## Métricas de Sucesso

Após deploy, monitore:

1. **Taxa de Sucesso de Criação de Mapeamento**
   - Meta: >99%
   - Como medir: Ratio de logs `✅ Mapeamento criado com sucesso` vs `❌ Erro ao criar mapeamento`

2. **Tempo de Resolução de Erros**
   - Meta: <1 minuto (diagnosticado via logs)
   - Como medir: Tempo entre erro e identificação da causa

3. **Satisfação do Usuário**
   - Meta: Sem tickets relacionados a "não consigo me cadastrar"
   - Como medir: Monitorar tickets de suporte

4. **Cobertura de Mapeamento**
   - Meta: 100% dos usuários ativos têm mapeamento
   - Como medir:
   ```sql
   SELECT 
     COUNT(DISTINCT u.id) as total_users,
     COUNT(DISTINCT atm.tabuladormax_user_id) as users_with_mapping,
     ROUND(100.0 * COUNT(DISTINCT atm.tabuladormax_user_id) / COUNT(DISTINCT u.id), 2) as coverage_pct
   FROM auth.users u
   LEFT JOIN agent_telemarketing_mapping atm ON u.id = atm.tabuladormax_user_id
   WHERE u.deleted_at IS NULL;
   ```

## Referências

- Migration: `supabase/migrations/20251014171900_fix_agent_telemarketing_mapping_rls.sql`
- Código: `src/pages/Auth.tsx`
- Testes: `src/__tests__/pages/Auth.test.tsx`
- Issues relacionadas: (adicionar links se aplicável)

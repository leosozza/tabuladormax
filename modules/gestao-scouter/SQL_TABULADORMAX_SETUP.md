# 🔧 Instruções de Configuração do TabuladorMax

## ⚠️ CRÍTICO: Atualizar SERVICE_ROLE_KEY

**Antes de qualquer coisa, você DEVE atualizar o secret `TABULADOR_SERVICE_KEY`:**

1. Acesse o projeto TabuladorMax: https://lovable.dev/projects/fa1475f9-ea99-4684-a990-84bdf96f348a
2. Vá em **Settings → Backend → Secrets**
3. Copie a **SERVICE_ROLE_KEY** (NÃO a anon key que está no .env)
4. Volte para este projeto (Gestão Scouter)
5. Vá em **Settings → Backend → Secrets**
6. Atualize o valor de `TABULADOR_SERVICE_KEY` com a SERVICE_ROLE_KEY copiada

**Por que é crítico:** A SERVICE_ROLE_KEY ignora RLS policies e tem acesso completo ao banco de dados, essencial para sincronização entre projetos.

---

## 📋 SQL para Executar no TabuladorMax

Execute este SQL no projeto TabuladorMax para adicionar suporte a sincronização incremental:

**Opção 1: Execute o script SQL completo (recomendado):**
```bash
# Execute o arquivo SQL completo que inclui verificações
# Arquivo: scripts/sql/tabuladormax_incremental_sync_setup.sql
```

**Opção 2: Execute os comandos SQL manualmente:**

```sql
-- =====================================================
-- 1. Adicionar coluna updated_at se não existir
-- =====================================================
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- 2. Criar índice para performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_leads_updated_at 
ON public.leads(updated_at DESC);

-- =====================================================
-- 3. Criar função para atualizar automaticamente
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. Criar trigger para atualizar em cada UPDATE
-- =====================================================
DROP TRIGGER IF EXISTS set_updated_at ON public.leads;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 5. Popular updated_at nos registros existentes
-- =====================================================
UPDATE public.leads
SET updated_at = COALESCE(
    updated_at,
    modificado,
    criado,
    NOW()
)
WHERE updated_at IS NULL;

-- =====================================================
-- 6. VERIFICAÇÃO
-- =====================================================
-- Execute para verificar se funcionou:
SELECT 
  COUNT(*) as total_leads,
  COUNT(updated_at) as com_updated_at,
  MAX(updated_at) as ultimo_update,
  MIN(updated_at) as primeiro_update
FROM public.leads;

-- Resultado esperado:
-- - total_leads: 218709
-- - com_updated_at: 218709
-- - ultimo_update: data recente
```

---

## 🧪 Como Testar Após Configuração

### 1. Testar Conexão
```bash
curl -X POST https://jstsrgyxrrlklnzgsihd.supabase.co/functions/v1/test-tabulador-connection \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzdHNyZ3l4cnJsa2xuemdzaWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDIyOTEsImV4cCI6MjA3NjUxODI5MX0.0uh9Uid5HZ3_TQB0877ncfhlYJwhxdMsQBReHZW2QLg"
```

### 2. Executar Diagnóstico
```bash
curl -X POST https://jstsrgyxrrlklnzgsihd.supabase.co/functions/v1/diagnose-tabulador-sync \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzdHNyZ3l4cnJsa2xuemdzaWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDIyOTEsImV4cCI6MjA3NjUxODI5MX0.0uh9Uid5HZ3_TQB0877ncfhlYJwhxdMsQBReHZW2QLg"
```

### 3. Testar Sincronização (Pull)
```bash
curl -X POST "https://jstsrgyxrrlklnzgsihd.supabase.co/functions/v1/sync-tabulador?direction=pull" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzdHNyZ3l4cnJsa2xuemdzaWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDIyOTEsImV4cCI6MjA3NjUxODI5MX0.0uh9Uid5HZ3_TQB0877ncfhlYJwhxdMsQBReHZW2QLg"
```

### Resultado Esperado
```json
{
  "success": true,
  "direction": "pull",
  "records_synced": 218709,
  "conflicts_resolved": 0,
  "errors": [],
  "processing_time_ms": 15000
}
```

---

## 🔍 O Que Foi Implementado

### ✅ Detecção Automática de Campos de Data
A Edge Function `sync-tabulador` agora:
- Detecta automaticamente qual campo de data usar (`updated_at`, `modificado`, `criado`)
- Tenta diferentes variações de nome de tabela (`leads`, `"Leads"`, `Leads`)
- Registra logs detalhados de cada tentativa

### ✅ Logging Detalhado
Agora você verá nos logs:
- Campo de data sendo usado
- Tentativas de conexão com cada variação de nome
- Contagem exata de registros encontrados
- Erros detalhados com códigos SQL
- Sugestões de correção quando há falhas

### ✅ Frontend Melhorado
O componente `TabuladorSync.tsx` agora mostra:
- Mensagens de erro detalhadas do último sync
- Status mais claro (sucesso/erro)
- Tratamento de valores nulos

### ✅ Bug Fixes
- Corrigido erro de variável `remoteFichas` → `remoteLeads` em `tabmax-sync`
- Adicionado tratamento de null para todos os campos numéricos no frontend

---

## 📊 Checklist de Configuração

- [ ] 1. Atualizar `TABULADOR_SERVICE_KEY` com SERVICE_ROLE_KEY do TabuladorMax
- [ ] 2. Executar SQL acima no TabuladorMax
- [ ] 3. Verificar que 218709 leads têm `updated_at` preenchido
- [ ] 4. Testar conexão via curl
- [ ] 5. Executar diagnóstico via curl
- [ ] 6. Executar sincronização via interface ou curl
- [ ] 7. Verificar logs da Edge Function para ver detalhes

---

## 🆘 Troubleshooting

### Erro: "Invalid API key" ou "403 Forbidden"
- ✅ Certifique-se de estar usando **SERVICE_ROLE_KEY**, não anon key

### Erro: "Column updated_at does not exist"
- ✅ Execute o SQL de criação da coluna no TabuladorMax

### Erro: "Table 'leads' not found"
- ✅ Verifique se a tabela se chama `leads`, `Leads`, ou outro nome
- ✅ Os logs agora mostram qual variação funcionou

### Sincronização retorna 0 registros
- ✅ Verifique se `updated_at` está populado em todos os registros
- ✅ Verifique a data do último sync em `sync_status`
- ✅ Teste com `lastSyncDate` mais antigo (ex: 7 dias atrás)

### Erro: RLS policy violation
- ✅ Certifique-se de estar usando SERVICE_ROLE_KEY (ignora RLS)
- ✅ Se persistir, adicione policy para `service_role`:
```sql
CREATE POLICY "Allow service role full access"
ON public.leads
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

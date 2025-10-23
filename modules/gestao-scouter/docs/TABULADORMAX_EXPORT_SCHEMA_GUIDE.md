# Guia: Criar Edge Function no TabuladorMax

## 🎯 Objetivo

Criar uma Edge Function no **TabuladorMax** que exporta o schema da tabela `leads` para o **Gestão Scouter**, permitindo sincronização automática sem Service Role Keys expostas.

## 📋 Pré-requisitos

- Acesso ao projeto **TabuladorMax**
- Permissão para criar Edge Functions
- URLs e API Keys dos dois projetos configuradas

## 🚀 Implementação

### Etapa 1: Criar o arquivo da Edge Function

**Caminho:** `supabase/functions/export-schema/index.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SchemaColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface ExportSchemaResult {
  success: boolean;
  columns_exported: number;
  target_response: any;
  processing_time_ms: number;
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const startTime = Date.now();
  
  try {
    console.log('📤 Exportando schema para Gestão Scouter...');

    // Parse request - expecting { target_url, target_api_key }
    const body = await req.json();
    const { target_url, target_api_key } = body;

    if (!target_url || !target_api_key) {
      throw new Error('target_url e target_api_key são obrigatórios');
    }

    // Get local Supabase credentials (TabuladorMax)
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Credenciais locais não configuradas');
    }

    console.log('✅ Credenciais validadas');

    // Create local client (TabuladorMax)
    const localClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    console.log('🔍 Lendo schema local da tabela leads...');

    // Read local schema
    const { data: localColumns, error: localError } = await localClient
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'leads')
      .order('ordinal_position');

    if (localError) {
      throw new Error(`Erro ao ler schema local: ${localError.message}`);
    }

    console.log(`📊 ${localColumns?.length || 0} colunas encontradas localmente`);

    if (!localColumns || localColumns.length === 0) {
      throw new Error('Nenhuma coluna encontrada na tabela leads');
    }

    // Send schema to Gestão Scouter
    console.log(`📤 Enviando schema para ${target_url}...`);

    const targetResponse = await fetch(`${target_url}/functions/v1/receive-schema-from-tabulador`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${target_api_key}`,
        'Content-Type': 'application/json',
        'apikey': target_api_key,
      },
      body: JSON.stringify({
        columns: localColumns
      }),
    });

    if (!targetResponse.ok) {
      const errorText = await targetResponse.text();
      throw new Error(`Erro ao enviar schema: ${targetResponse.status} - ${errorText}`);
    }

    const targetResult = await targetResponse.json();
    
    console.log('✅ Schema enviado com sucesso!');
    console.log('Resultado:', targetResult);

    const processingTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        columns_exported: localColumns.length,
        target_response: targetResult,
        processing_time_ms: processingTime,
      } as ExportSchemaResult),
      {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Erro ao exportar schema:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        columns_exported: 0,
        target_response: null,
        processing_time_ms: processingTime,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      } as ExportSchemaResult),
      {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
```

---

### Etapa 2: Configurar Edge Function

**Arquivo:** `supabase/config.toml` (no TabuladorMax)

Adicione a configuração da nova função:

```toml
[functions.export-schema]
verify_jwt = false
```

⚠️ **Importante:** NÃO remova as configurações das outras Edge Functions existentes!

---

### Etapa 3: Deploy da Edge Function

Execute no terminal do **TabuladorMax**:

```bash
# Deploy apenas da nova função
npx supabase functions deploy export-schema

# Ou deploy de todas as funções
npx supabase functions deploy
```

---

### Etapa 4: Teste Manual (Opcional)

Teste a Edge Function manualmente:

```bash
curl -X POST "https://[seu-project-id].supabase.co/functions/v1/export-schema" \
  -H "Authorization: Bearer [ANON_KEY_TABULADORMAX]" \
  -H "Content-Type: application/json" \
  -d '{
    "target_url": "https://jstsrgyxrrlklnzgsihd.supabase.co",
    "target_api_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

Resultado esperado:
```json
{
  "success": true,
  "columns_exported": 55,
  "target_response": {
    "success": true,
    "columns_added": [...]
  },
  "processing_time_ms": 1234
}
```

---

## 🔗 Integração com Gestão Scouter

### Fluxo Completo

```
┌────────────────────────┐
│  Gestão Scouter (UI)   │
│  Clica "Sincronizar    │
│  Schema"               │
└────────────┬───────────┘
             │
             │ 1. POST /export-schema
             │    { target_url, target_api_key }
             │
             ▼
┌────────────────────────┐
│   TabuladorMax         │
│   export-schema        │
│   Edge Function        │
└────────────┬───────────┘
             │
             │ 2. Lê schema local (via service_role interno)
             │    SELECT * FROM information_schema.columns
             │
             │ 3. POST /receive-schema-from-tabulador
             │    { columns: [...] }
             │
             ▼
┌────────────────────────┐
│  Gestão Scouter        │
│  receive-schema        │
│  Edge Function         │
└────────────┬───────────┘
             │
             │ 4. Compara schemas
             │ 5. Executa ALTER TABLE
             │ 6. Cria índices
             │ 7. NOTIFY pgrst
             │
             ▼
          ✅ Sucesso!
```

---

## 🛡️ Segurança

### O que esta Edge Function FAZ:
✅ Lê schema local usando service_role **interno** do TabuladorMax  
✅ Envia definições de colunas via HTTP POST  
✅ Usa apenas ANON_KEY do Gestão Scouter (não precisa de Service Key)  
✅ Valida credenciais antes de executar  
✅ Registra logs detalhados  

### O que NÃO faz:
❌ NUNCA expõe Service Role Keys  
❌ NUNCA lê dados dos registros (apenas schema)  
❌ NUNCA modifica dados no TabuladorMax  
❌ NUNCA executa SQL no TabuladorMax  

---

## 📊 Variáveis de Ambiente (Secrets)

A Edge Function precisa destes secrets **JÁ CONFIGURADOS** automaticamente pelo Supabase:

- `SUPABASE_URL` - URL do projeto TabuladorMax (automático)
- `SUPABASE_SERVICE_ROLE_KEY` - Service Role do TabuladorMax (automático)

Não é necessário configurar nada manualmente!

---

## 🐛 Troubleshooting

### Erro: "Credenciais locais não configuradas"

**Causa:** Edge Function não consegue acessar `SUPABASE_URL` ou `SUPABASE_SERVICE_ROLE_KEY`.

**Solução:**
- Estes secrets são fornecidos automaticamente pelo Supabase
- Verifique se a Edge Function foi deployada corretamente
- Reinicie a Edge Function

### Erro: "target_url e target_api_key são obrigatórios"

**Causa:** Request não incluiu os parâmetros necessários.

**Solução:**
```typescript
// Certifique-se de enviar:
{
  "target_url": "https://jstsrgyxrrlklnzgsihd.supabase.co",
  "target_api_key": "eyJhbGci..."
}
```

### Erro: "Erro ao enviar schema: 401"

**Causa:** `target_api_key` (ANON_KEY do Gestão Scouter) está incorreto.

**Solução:**
- Verifique se a ANON_KEY está correta
- Confirme se a Edge Function `receive-schema-from-tabulador` está configurada como pública (`verify_jwt = false`)

### Erro: "Nenhuma coluna encontrada na tabela leads"

**Causa:** Tabela `leads` não existe no TabuladorMax ou está vazia.

**Solução:**
- Verifique se a tabela `public.leads` existe
- Confirme que possui colunas definidas

---

## ✅ Checklist de Implementação

- [ ] Arquivo `supabase/functions/export-schema/index.ts` criado
- [ ] Configuração adicionada em `supabase/config.toml`
- [ ] Edge Function deployada (`supabase functions deploy export-schema`)
- [ ] Teste manual executado com sucesso
- [ ] Logs aparecem sem erros
- [ ] Gestão Scouter recebe schema corretamente

---

## 📞 Próximos Passos

Após implementar esta Edge Function no TabuladorMax:

1. **No Gestão Scouter:**
   - A UI já está configurada para chamar esta função
   - Basta clicar em "Sincronizar Schema"
   - O sistema fará todo o resto automaticamente

2. **Teste End-to-End:**
   ```
   Gestão Scouter (UI) 
   → Clica "Sincronizar Schema"
   → Chama TabuladorMax/export-schema
   → TabuladorMax envia schema
   → Gestão Scouter recebe e aplica
   → ✅ Sucesso!
   ```

3. **Manutenção:**
   - Esta Edge Function não precisa de manutenção regular
   - Funciona automaticamente a cada sincronização

---

## 🔗 Documentação Relacionada

- **Gestão Scouter - Auto-Sync:** `docs/SCHEMA_AUTO_SYNC.md`
- **Arquitetura:** `SYNC_ARCHITECTURE_GESTAO_SCOUTER.md`
- **Edge Functions Actions:** `EDGE_FUNCTIONS_ACTIONS.md`

---

**Última atualização:** 2025-10-21  
**Status:** 📝 Aguardando implementação no TabuladorMax
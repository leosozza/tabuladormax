# Importação de Dados - Gestão Scouter

## ⚠️ NOTA: Este documento está parcialmente obsoleto

**Status**: ⚠️ PARCIALMENTE OBSOLETO - A aplicação agora utiliza exclusivamente a tabela 'leads' do Supabase como fonte única de verdade, sincronizada com TabuladorMax.

**Arquitetura Atual**: TabuladorMax → Supabase (tabela 'leads') → Repository → Hook → Componente

**Métodos de Importação Atuais**:
1. **Sincronização Automática com TabuladorMax** (Recomendado) - Via Edge Functions
2. **Importação Manual de CSV/Excel** - Via dashboard da aplicação

Para informações atualizadas, consulte:
- [LEADS_DATA_SOURCE.md](../LEADS_DATA_SOURCE.md) - Guia completo da arquitetura atual
- [CSV_IMPORT_GUIDE.md](../CSV_IMPORT_GUIDE.md) - Guia de importação de CSV
- [README.md](../README.md) - Seção de sincronização com TabuladorMax

---

## Descrição Original (Obsoleta)

## Objetivo

Este documento descreve processos de importação históricos para a tabela `fichas` (agora migrada para 'leads'), incluindo sincronização com TabuladorMax.

## Pré-requisitos

- Schema do banco de dados configurado
- Acesso ao Supabase Dashboard ou Supabase CLI
- Dados fonte disponíveis (CSV ou TabuladorMax)

## Métodos de Importação (Obsoletos - Use TabuladorMax sync ou CSV Import)

### Método 1: Sincronização com TabuladorMax (Atual e Recomendado)

A sincronização automática com TabuladorMax é gerenciada por Edge Functions do Supabase. Consulte o README.md principal para detalhes.

### Método 2: Google Sheets via Edge Function (OBSOLETO - Não usar)

Este método não é mais suportado. Use sincronização com TabuladorMax ou importação de CSV.
    headers: {
      'X-Secret': SHARED_SECRET
    },
    payload: JSON.stringify({ fichas: fichas })
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    Logger.log('Sync completo: ' + response.getContentText());
  } catch (error) {
    Logger.log('Erro no sync: ' + error);
  }
}

// Executar automaticamente a cada 5 minutos
function createTimeTrigger() {
  ScriptApp.newTrigger('syncFichasToSupabase')
    .timeBased()
    .everyMinutes(5)
    .create();
}
```

4. **Salvar e executar `createTimeTrigger` uma vez**
5. **Autorizar o script quando solicitado**

#### 1.2 Configurar Edge Function no Supabase

1. **Criar arquivo `supabase/functions/sync-fichas/index.ts`:**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SHARED_SECRET = Deno.env.get('SHEETS_SYNC_SHARED_SECRET')!;

serve(async (req) => {
  // Verificar autenticação
  const secret = req.headers.get('X-Secret');
  if (secret !== SHARED_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { fichas } = await req.json();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  let synced = 0;
  let errors = 0;

  for (const ficha of fichas) {
    try {
      // Upsert (insert or update)
      const { error } = await supabase
        .from('fichas')
        .upsert({
          ...ficha,
          sync_source: 'GoogleSheets',
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) throw error;
      synced++;
    } catch (error) {
      console.error('Erro ao sincronizar ficha:', error);
      errors++;
    }
  }

  return new Response(
    JSON.stringify({ synced, errors }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

2. **Deploy da função:**
```bash
supabase functions deploy sync-fichas
```

3. **Configurar variáveis de ambiente no Supabase Dashboard:**
   - `SHEETS_SYNC_SHARED_SECRET`: Um secret aleatório
   - `SUPABASE_URL`: URL do projeto
   - `SUPABASE_SERVICE_ROLE_KEY`: Service role key

### Método 2: CSV/Excel via Supabase Dashboard

Este método é útil para importações pontuais.

#### 2.1 Preparar Arquivo CSV

1. **Estrutura do CSV (colunas obrigatórias):**

```csv
id,nome,telefone,email,projeto,scouter,criado,valor_ficha,etapa
1,João Silva,11987654321,joao@example.com,Projeto A,Maria,2025-01-15,150.00,Contato
2,Ana Santos,11976543210,ana@example.com,Projeto B,Pedro,2025-01-16,200.00,Agendado
```

2. **Colunas opcionais (adicione conforme necessário):**
   - `celular`, `telefone_trabalho`, `telefone_casa`
   - `idade`, `address`, `photo_url`
   - `localizacao`, `lat`, `lng`
   - `etapa_funil`, `status_fluxo`, `ficha_confirmada`
   - `data_agendamento`, `compareceu`, `aprovado`
   - E todas as outras 36+ colunas disponíveis

#### 2.2 Importar via Dashboard

1. **Acessar Table Editor no Supabase Dashboard**
2. **Selecionar tabela `fichas`**
3. **Clicar em "Insert" → "Import data from CSV"**
4. **Upload do arquivo CSV**
5. **Mapear colunas (automático se nomes coincidirem)**
6. **Clicar em "Import"**

**Nota:** O Dashboard tem limite de ~1000 linhas. Para volumes maiores, use o Método 3.

### Método 3: CSV/Excel via Script Node.js

Para volumes grandes de dados (1000+ linhas).

#### 3.1 Instalar Dependências

```bash
npm install csv-parser @supabase/supabase-js
```

#### 3.2 Criar Script de Importação

Criar arquivo `scripts/importCsvToFichas.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import csv from 'csv-parser';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function importCsv(filePath: string) {
  const fichas: any[] = [];

  // Ler CSV
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Mapear campos do CSV para schema do banco
        const ficha = {
          id: row.id || undefined,
          nome: row.nome || row.name,
          telefone: row.telefone || row.celular,
          celular: row.celular,
          email: row.email,
          projeto: row.projeto,
          scouter: row.scouter,
          criado: row.criado ? new Date(row.criado).toISOString().split('T')[0] : undefined,
          valor_ficha: row.valor_ficha ? parseFloat(row.valor_ficha) : undefined,
          etapa: row.etapa,
          localizacao: row.localizacao,
          lat: row.lat ? parseFloat(row.lat) : undefined,
          lng: row.lng ? parseFloat(row.lng) : undefined,
          aprovado: row.aprovado === 'true' || row.aprovado === '1' ? true : 
                    row.aprovado === 'false' || row.aprovado === '0' ? false : null,
          sync_source: 'CsvImport',
          last_synced_at: new Date().toISOString(),
          raw: row // Backup dos dados originais
        };
        fichas.push(ficha);
      })
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`Lidos ${fichas.length} registros do CSV`);

  // Importar em lotes de 100
  const batchSize = 100;
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < fichas.length; i += batchSize) {
    const batch = fichas.slice(i, i + batchSize);
    
    try {
      const { data, error } = await supabase
        .from('fichas')
        .upsert(batch, { onConflict: 'id' });

      if (error) throw error;
      
      imported += batch.length;
      console.log(`Importados ${imported}/${fichas.length}`);
    } catch (error) {
      console.error('Erro no lote:', error);
      errors += batch.length;
    }
  }

  console.log('\n=== Resumo da Importação ===');
  console.log(`Total lidos: ${fichas.length}`);
  console.log(`Importados com sucesso: ${imported}`);
  console.log(`Erros: ${errors}`);
}

// Executar
const csvFile = process.argv[2] || 'data/fichas.csv';
importCsv(csvFile)
  .then(() => console.log('Importação concluída'))
  .catch(err => console.error('Erro fatal:', err));
```

#### 3.3 Executar Script

```bash
# Com arquivo padrão
tsx scripts/importCsvToFichas.ts

# Com arquivo customizado
tsx scripts/importCsvToFichas.ts caminho/para/seu/arquivo.csv
```

### Método 4: Sincronização do TabuladorMax

Para sincronizar dados existentes do projeto TabuladorMax.

#### 4.1 Script de Sincronização

O script já existe em `scripts/syncDiagnostics.ts`. Executar:

```bash
# Modo dry-run (apenas visualizar)
npm run diagnostics:sync

# Modo escrita (executar sincronização)
npm run diagnostics:sync:write
```

#### 4.2 Verificar Sincronização

Após executar, verificar:

```sql
-- Ver últimas sincronizações
SELECT * FROM public.sync_logs
ORDER BY started_at DESC
LIMIT 10;

-- Ver status atual
SELECT * FROM public.sync_status
WHERE project_name = 'tabulador_max';

-- Contar fichas por sync_source
SELECT 
  sync_source,
  COUNT(*) as total
FROM public.fichas
WHERE deleted = false
GROUP BY sync_source;
```

## Validação Pós-Importação

### 1. Verificar Total de Registros

```sql
SELECT COUNT(*) as total_fichas
FROM public.fichas
WHERE deleted = false;
```

### 2. Verificar Dados por Origem

```sql
SELECT 
  sync_source,
  COUNT(*) as total,
  MIN(created_at) as primeira_importacao,
  MAX(created_at) as ultima_importacao
FROM public.fichas
WHERE deleted = false
GROUP BY sync_source
ORDER BY total DESC;
```

### 3. Verificar Completude dos Dados

```sql
-- Verificar campos críticos preenchidos
SELECT 
  COUNT(*) as total,
  COUNT(nome) as tem_nome,
  COUNT(telefone) as tem_telefone,
  COUNT(celular) as tem_celular,
  COUNT(email) as tem_email,
  COUNT(projeto) as tem_projeto,
  COUNT(scouter) as tem_scouter,
  ROUND(COUNT(nome) * 100.0 / COUNT(*), 2) as percent_nome,
  ROUND(COUNT(telefone) * 100.0 / COUNT(*), 2) as percent_telefone
FROM public.fichas
WHERE deleted = false;
```

### 4. Verificar Duplicatas

```sql
-- Verificar possíveis duplicatas por telefone
SELECT 
  telefone,
  COUNT(*) as quantidade
FROM public.fichas
WHERE deleted = false
  AND telefone IS NOT NULL
GROUP BY telefone
HAVING COUNT(*) > 1
ORDER BY quantidade DESC;
```

### 5. Verificar Geo-localização

```sql
-- Verificar fichas com coordenadas
SELECT 
  COUNT(*) as total,
  COUNT(lat) as tem_lat,
  COUNT(lng) as tem_lng,
  COUNT(localizacao) as tem_localizacao,
  ROUND(COUNT(lat) * 100.0 / COUNT(*), 2) as percent_geo
FROM public.fichas
WHERE deleted = false;
```

## Manutenção e Limpeza

### Remover Duplicatas

```sql
-- Identificar e marcar duplicatas (manter a mais recente)
WITH duplicatas AS (
  SELECT 
    id,
    telefone,
    ROW_NUMBER() OVER (
      PARTITION BY telefone 
      ORDER BY created_at DESC
    ) as rn
  FROM public.fichas
  WHERE telefone IS NOT NULL
    AND deleted = false
)
UPDATE public.fichas
SET deleted = true
WHERE id IN (
  SELECT id FROM duplicatas WHERE rn > 1
);
```

### Limpar Dados de Teste

```sql
-- Remover fichas de teste
DELETE FROM public.fichas
WHERE nome LIKE '%Teste%'
   OR nome LIKE '%Test%'
   OR telefone LIKE '%999999%';
```

### Atualizar Campos Vazios

```sql
-- Copiar 'nome' para 'name' se vazio
UPDATE public.fichas
SET name = nome
WHERE name IS NULL AND nome IS NOT NULL;

-- Copiar 'telefone' para 'celular' se vazio
UPDATE public.fichas
SET celular = telefone
WHERE celular IS NULL AND telefone IS NOT NULL;

-- Copiar 'lat' para 'latitude' e 'lng' para 'longitude'
UPDATE public.fichas
SET latitude = lat, longitude = lng
WHERE latitude IS NULL AND lat IS NOT NULL;
```

## Troubleshooting

### Problema: Erro "duplicate key value"

**Causa:** IDs duplicados no arquivo de importação

**Solução:**
1. Remover coluna `id` do CSV (deixar o banco gerar automaticamente)
2. Ou garantir que IDs são únicos no arquivo

### Problema: Erro de tipo de dado

**Causa:** Dados no CSV não compatíveis com schema (ex: texto em campo numérico)

**Solução:**
1. Validar e limpar dados antes de importar
2. Usar script Node.js com conversão de tipos

### Problema: Importação muito lenta

**Causa:** RLS e triggers processando cada linha

**Solução:**
1. Usar Service Role Key (bypassa RLS)
2. Importar em lotes maiores (100-500 linhas)
3. Temporariamente desabilitar triggers não essenciais

### Problema: Coordenadas não aparecem no mapa

**Causa:** Campos lat/lng ou latitude/longitude vazios

**Solução:**
```sql
-- Geocodificar endereços (requer Edge Function de geocoding)
-- Ou importar planilha com coordenadas já preenchidas
UPDATE public.fichas
SET lat = -23.550520, lng = -46.633308
WHERE localizacao LIKE '%São Paulo%'
  AND lat IS NULL;
```

## Backup Antes de Importação

**Sempre fazer backup antes de importações grandes:**

```bash
# Via Supabase CLI
supabase db dump -f backup-before-import.sql

# Ou via Dashboard: Settings → Backups → Create Backup
```

## Próximos Passos

Após importação bem-sucedida:

1. ✅ Validar dados no banco (queries acima)
2. ✅ Testar exibição no front-end
3. ✅ Configurar sincronização automática (Google Sheets)
4. ✅ Documentar mapeamento de campos específicos do projeto
5. ✅ Configurar backups automáticos
6. ✅ Testar sincronização bidirecional (ver `docs/TESTE_SINCRONIZACAO.md`)

---

**Última atualização:** 2025-10-18  
**Versão:** 1.0  
**Autor:** GitHub Copilot

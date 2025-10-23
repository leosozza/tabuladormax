# Edge Functions - Gestão Scouter

Este documento descreve as Edge Functions implementadas para sincronização e importação de dados.

## Funções Disponíveis

### 1. tabmax-sync

Sincronização robusta com TabuladorMax usando paginação e introspecção de schema.

**Endpoint:** `POST /functions/v1/tabmax-sync`

**Variáveis de Ambiente Necessárias:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Configuração Prévia:**
- Tabela `tabulador_config` deve ter um registro ativo com:
  - `url`: URL do projeto TabuladorMax
  - `publishable_key`: Chave pública do TabuladorMax
  - `project_id`: ID do projeto
  - `enabled`: true

**Funcionamento:**
1. Busca configuração ativa do TabuladorMax no banco local
2. Conecta ao banco remoto do TabuladorMax
3. Busca dados da view `fichas_sync` com paginação (1000 registros por vez)
4. Realiza upsert na tabela `fichas` local
5. Registra log de sincronização na tabela `sync_logs`

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 5000,
    "inserted": 0,
    "updated": 5000,
    "failed": 0,
    "errors": []
  },
  "message": "Sincronizados 5000 registros de 5000 com 0 falhas"
}
```

**Uso no Frontend:**
```typescript
const { data, error } = await supabase.functions.invoke('tabmax-sync');
```

---

### 2. csv-import-leads

Importação de arquivos CSV com validação, normalização de encoding e parse robusto.

**Endpoint:** `POST /functions/v1/csv-import-leads`

**Variáveis de Ambiente Necessárias:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Parâmetros (Form Data):**
- `file`: Arquivo CSV (obrigatório)
- `table`: Nome da tabela destino (padrão: 'fichas')

**Recursos:**
- Detecção automática de separador (`,`, `;`, `\t`, `|`)
- Remoção de BOM (Byte Order Mark)
- Normalização de nomes de colunas
- Mapeamento inteligente de campos comuns
- Validação de campos obrigatórios (nome, scouter)
- Parse robusto de CSV com suporte a aspas

**Mapeamentos de Campos:**
- `nome`: nome, name, Nome, Name
- `idade`: idade, age, Idade, Age
- `scouter`: scouter, Scouter, scout
- `projeto`: projeto, projetos, Projeto, project
- `telefone`: telefone, phone, celular
- `email`: email, Email, e-mail
- E outros...

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 1000,
    "inserted": 950,
    "updated": 950,
    "failed": 50,
    "errors": ["Linha 10: Dados insuficientes..."]
  },
  "message": "Importados 950 registros de 1000 com 50 falhas"
}
```

**Uso no Frontend:**
```typescript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('table', 'fichas');

const { data, error } = await supabase.functions.invoke('csv-import-leads', {
  body: formData
});
```

---

## Deployment

### Pré-requisitos
1. Supabase CLI instalado: `npm install -g supabase`
2. Autenticado no projeto: `supabase login`
3. Linked ao projeto: `supabase link --project-ref your-project-ref`

### Deploy de uma função específica
```bash
supabase functions deploy tabmax-sync
supabase functions deploy csv-import-leads
```

### Deploy de todas as funções
```bash
supabase functions deploy
```

### Configurar variáveis de ambiente
```bash
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-key
```

---

## Logs e Debugging

### Visualizar logs em tempo real
```bash
supabase functions logs tabmax-sync --tail
supabase functions logs csv-import-leads --tail
```

### Consultar logs históricos
```sql
SELECT * FROM sync_logs 
WHERE endpoint IN ('tabmax-sync', 'csv-import-leads')
ORDER BY created_at DESC 
LIMIT 50;
```

---

## Troubleshooting

### Erro: "Configuração do TabuladorMax não encontrada"
**Solução:** Verifique se há um registro ativo em `tabulador_config`:
```sql
SELECT * FROM tabulador_config WHERE enabled = true;
```

### Erro de encoding no CSV
**Solução:** A função detecta e remove BOM automaticamente. Certifique-se de que o arquivo está em UTF-8.

### Erro de separador no CSV
**Solução:** A função detecta automaticamente `,`, `;`, `\t` e `|`. Para outros separadores, modifique o array `separators` na função.

### Timeout na sincronização
**Solução:** Edge Functions têm timeout de 60 segundos por padrão. Para grandes volumes, considere:
1. Reduzir `pageSize` na função
2. Implementar sincronização incremental (apenas registros novos/alterados)
3. Usar cron jobs para sincronização periódica

---

## Segurança

### Autenticação
Todas as funções verificam autenticação via token JWT no header `Authorization`:
```
Authorization: Bearer <user-access-token>
```

### RLS (Row Level Security)
As funções usam `service_role` key para bypass de RLS quando necessário, mas validações de permissão são feitas em nível de aplicação.

### CORS
CORS está habilitado para todos os origins (`*`). Em produção, considere restringir:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-domain.com',
  // ...
}
```

---

## Monitoramento

### Métricas importantes
- Taxa de sucesso/falha
- Tempo de execução
- Volume de dados processados
- Erros por tipo

### Query para dashboard de monitoramento
```sql
SELECT 
  endpoint,
  status,
  COUNT(*) as total,
  AVG(execution_time_ms) as avg_time_ms,
  SUM(records_count) as total_records
FROM sync_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY endpoint, status
ORDER BY endpoint, status;
```

---

## Próximos Passos

1. **Sincronização bidirecional**: Implementar sync de local → TabuladorMax
2. **Webhook support**: Receber notificações de mudanças do TabuladorMax
3. **Incremental sync**: Sincronizar apenas registros alterados desde último sync
4. **Retry mechanism**: Implementar retry automático para falhas temporárias
5. **Rate limiting**: Implementar throttling para evitar sobrecarga

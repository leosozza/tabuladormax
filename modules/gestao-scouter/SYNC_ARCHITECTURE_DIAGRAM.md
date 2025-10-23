# Diagrama de Arquitetura - Sincronização Bidirecional

## Visão Geral do Sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          TABULADORMAX                                    │
│                   (gkvvtfqfggddzotxltxf)                                │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      Tabela: leads                                │  │
│  │  ┌────────┬─────────┬──────────┬───────────┬─────────────────┐  │  │
│  │  │   id   │  nome   │ telefone │  projeto  │   updated_at    │  │  │
│  │  ├────────┼─────────┼──────────┼───────────┼─────────────────┤  │  │
│  │  │ 12345  │  João   │  999...  │ Projeto A │ 2025-10-17 ...  │  │  │
│  │  │ 67890  │  Maria  │  888...  │ Projeto B │ 2025-10-17 ...  │  │  │
│  │  └────────┴─────────┴──────────┴───────────┴─────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↕
                    ┌───────────────────────────────┐
                    │   SINCRONIZAÇÃO BIDIRECIONAL  │
                    └───────────────────────────────┘
                                    ↕
        ┌──────────────────┬────────────────┬──────────────────┐
        ↓                  ↓                ↓                  ↓
┌─────────────┐   ┌─────────────┐   ┌──────────────┐   ┌────────────┐
│  Webhook    │   │   Export    │   │   Sync Bi    │   │   Queue    │
│  Receber    │   │   Enviar    │   │  (Cron 5min) │   │ (Cron 1min)│
└─────────────┘   └─────────────┘   └──────────────┘   └────────────┘
        ↓                  ↑                ↕                  ↑
┌─────────────────────────────────────────────────────────────────────────┐
│                         GESTÃO SCOUTER                                   │
│                   (ngestyxtopvfeyenyvgt)                                │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      Tabela: fichas                               │  │
│  │  ┌────┬──────┬────────┬────────┬──────────┬──────────┬──────┐   │  │
│  │  │ id │ nome │telefone│projeto │updated_at│sync_source│last_│   │  │
│  │  │    │      │        │        │          │           │synced│   │  │
│  │  ├────┼──────┼────────┼────────┼──────────┼──────────┼──────┤   │  │
│  │  │12345│João │999...  │Proj A  │2025-10..│TabuladorM│2025..│   │  │
│  │  │67890│Maria│888...  │Proj B  │2025-10..│Gestao    │2025..│   │  │
│  │  └────┴──────┴────────┴────────┴──────────┴──────────┴──────┘   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                  │                                      │
│                         Trigger on INSERT/UPDATE                        │
│                                  ↓                                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     Tabela: sync_queue                            │  │
│  │  ┌────────┬───────────┬──────────┬────────┬──────────┬────────┐  │  │
│  │  │   id   │ ficha_id  │operation │ status │retry_count│ error  │  │  │
│  │  ├────────┼───────────┼──────────┼────────┼──────────┼────────┤  │  │
│  │  │ uuid1  │   12345   │  update  │pending │    0     │  null  │  │  │
│  │  │ uuid2  │   67890   │  insert  │completed│   0     │  null  │  │  │
│  │  └────────┴───────────┴──────────┴────────┴──────────┴────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      Tabela: sync_logs                            │  │
│  │  ┌────────┬──────────────┬────────┬────────┬────────┬─────────┐  │  │
│  │  │   id   │sync_direction│synced  │failed  │time_ms │metadata │  │  │
│  │  ├────────┼──────────────┼────────┼────────┼────────┼─────────┤  │  │
│  │  │ uuid1  │tabulador_to_│  100   │   0    │ 2345   │{batch..}│  │  │
│  │  │ uuid2  │gestao_to_tab│   50   │   2    │ 1234   │{filters}│  │  │
│  │  └────────┴──────────────┴────────┴────────┴────────┴─────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Tabela: sync_status                            │  │
│  │  ┌─────────────┬─────────────┬──────────┬──────────┬──────────┐  │  │
│  │  │project_name │last_sync_at │  success │  records │   error  │  │  │
│  │  ├─────────────┼─────────────┼──────────┼──────────┼──────────┤  │  │
│  │  │gestao_scouter│2025-10-17..│   true   │   150   │   null   │  │  │
│  │  │tabulador_max│2025-10-17..│   true   │   100   │   null   │  │  │
│  │  └─────────────┴─────────────┴──────────┴──────────┴──────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
                    ┌───────────────────────────────┐
                    │    INTERFACE DE MONITORAMENTO │
                    │         /sync-monitor         │
                    └───────────────────────────────┘
```

## Fluxo de Dados Detalhado

### 1. Recebimento de Dados (TabuladorMax → Gestão)

```
┌─────────────┐
│ TabuladorMax│
│   (leads)   │
└──────┬──────┘
       │
       │ POST /tabulador-webhook
       │ {source, timestamp, records[]}
       ↓
┌─────────────────────────┐
│ Edge Function:          │
│ tabulador-webhook       │
├─────────────────────────┤
│ 1. Validar API key      │
│ 2. Validar payload      │
│ 3. Validar campos       │
│ 4. Normalizar dados     │
└──────┬──────────────────┘
       │
       │ Para cada lote de 500
       ↓
┌─────────────────────────┐
│ 1. Buscar IDs existentes│
│ 2. Comparar timestamps  │
│ 3. Separar insert/update│
└──────┬──────────────────┘
       │
       ↓
┌─────────────────────────┐
│ Tabela: fichas          │
│ - INSERT novos          │
│ - UPDATE modificados    │
│ - SKIP duplicados       │
└──────┬──────────────────┘
       │
       ↓
┌─────────────────────────┐
│ Tabela: sync_logs       │
│ - Registrar operação    │
│ - Salvar metadata       │
└──────┬──────────────────┘
       │
       ↓
┌─────────────────────────┐
│ Response 200 OK         │
│ {success, inserted,     │
│  updated, skipped...}   │
└─────────────────────────┘
```

### 2. Exportação Manual (Gestão → TabuladorMax)

```
┌─────────────┐
│ UI Browser  │
│/sync-monitor│
└──────┬──────┘
       │
       │ Click "Sincronizar Agora"
       ↓
┌─────────────────────────┐
│ POST /tabulador-export  │
│ {filters, dry_run}      │
└──────┬──────────────────┘
       │
       ↓
┌─────────────────────────┐
│ Edge Function:          │
│ tabulador-export        │
├─────────────────────────┤
│ 1. Validar API key      │
│ 2. Aplicar filtros      │
│ 3. Buscar fichas        │
└──────┬──────────────────┘
       │
       │ Se dry_run = true
       ├─────────────────────┐
       │                     │
       ↓                     ↓
┌──────────────┐    ┌──────────────────┐
│Return count  │    │Para cada lote 500│
│and sample IDs│    └──────┬───────────┘
└──────────────┘           │
                           ↓
                  ┌─────────────────────┐
                  │ Verificar existentes│
                  │ em TabuladorMax     │
                  └──────┬──────────────┘
                         │
                         ↓
                  ┌─────────────────────┐
                  │ Comparar timestamps │
                  │ Separar upserts     │
                  └──────┬──────────────┘
                         │
                         ↓
                  ┌─────────────────────┐
                  │ TabuladorMax        │
                  │ UPSERT leads        │
                  └──────┬──────────────┘
                         │
                         ↓
                  ┌─────────────────────┐
                  │ Tabela: sync_logs   │
                  │ Registrar exportação│
                  └──────┬──────────────┘
                         │
                         ↓
                  ┌─────────────────────┐
                  │ Response 200 OK     │
                  │{exported, failed..} │
                  └─────────────────────┘
```

### 3. Sincronização Automática via Fila

```
┌─────────────┐
│   fichas    │
│ (INSERT/    │
│  UPDATE)    │
└──────┬──────┘
       │
       │ TRIGGER: fichas_sync_trigger
       ↓
┌─────────────────────────┐
│ Verificações:           │
│ - sync_source != TM?    │
│ - last_synced não recent│
└──────┬──────────────────┘
       │ Se passou
       ↓
┌─────────────────────────┐
│ Tabela: sync_queue      │
│ INSERT item pendente    │
│ {ficha_id, operation,   │
│  payload, status}       │
└──────┬──────────────────┘
       │
       │ Aguarda cron (1 min)
       ↓
┌─────────────────────────┐
│ Edge Function:          │
│ process-sync-queue      │
│ (executada por cron)    │
├─────────────────────────┤
│ 1. Buscar 100 pending   │
│ 2. Marcar processing    │
└──────┬──────────────────┘
       │
       │ Para cada item
       ↓
┌─────────────────────────┐
│ 1. Mapear para lead     │
│ 2. UPSERT TabuladorMax  │
│ 3. Atualizar last_synced│
└──────┬──────────────────┘
       │
       ├─ Sucesso ──────────┐
       │                    │
       ↓                    ↓
┌──────────────┐   ┌──────────────┐
│ Status:      │   │ Status:      │
│ completed    │   │ pending/failed│
│              │   │ retry++      │
└──────────────┘   └──────────────┘
```

### 4. Prevenção de Loops

```
Cenário: Receber do TabuladorMax

┌─────────────┐
│ TabuladorMax│
│  POST data  │
└──────┬──────┘
       │
       ↓
┌─────────────────────────┐
│ tabulador-webhook       │
│ INSERT/UPDATE fichas    │
│ SET sync_source='TM'    │
│ SET last_synced_at=NOW()│
└──────┬──────────────────┘
       │
       │ TRIGGER fires
       ↓
┌─────────────────────────┐
│ fichas_sync_trigger     │
│ IF sync_source='TM' AND │
│    last_synced recent   │
│ THEN SKIP (no queue)    │
└──────┬──────────────────┘
       │
       ↓
┌─────────────────────────┐
│ ✅ LOOP PREVENTED       │
│ Não adiciona à fila     │
└─────────────────────────┘

Cenário: Modificação Local

┌─────────────┐
│ UI/Usuario  │
│ UPDATE ficha│
└──────┬──────┘
       │
       ↓
┌─────────────────────────┐
│ UPDATE fichas           │
│ sync_source='Gestao'    │
└──────┬──────────────────┘
       │
       │ TRIGGER fires
       ↓
┌─────────────────────────┐
│ fichas_sync_trigger     │
│ sync_source != 'TM' OR  │
│ last_synced not recent  │
│ → ADD to queue          │
└──────┬──────────────────┘
       │
       ↓
┌─────────────────────────┐
│ ✅ QUEUED FOR EXPORT    │
│ Será enviado ao TM      │
└─────────────────────────┘
```

## Componentes da Interface

```
┌────────────────────────────────────────────────────────────────┐
│                      /sync-monitor                              │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────┬──────────────┬──────────────┬─────────────┐ │
│  │Total Sinc.   │   Falhas     │ Tempo Médio  │ Fila Pend.  │ │
│  │   15,234     │      12      │    2.3s      │     45      │ │
│  └──────────────┴──────────────┴──────────────┴─────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Gráfico: Histórico de Sincronizações             │  │
│  │                                                           │  │
│  │  Registros  ▲                                            │  │
│  │            │         ╱╲                                   │  │
│  │     200    │        ╱  ╲      ╱╲                         │  │
│  │     100    │    ╱╲ ╱    ╲    ╱  ╲                        │  │
│  │       0    └────────────────────────────────────▶ Tempo  │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────┬─────────┬─────────┐                              │
│  │ Status  │  Logs   │  Fila   │  ← Tabs                      │
│  └─────────┴─────────┴─────────┘                              │
│                                                                 │
│  Conteúdo da tab selecionada:                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Data/Hora         | Direção  | Sync | Fail | Status      │  │
│  ├──────────────────┼──────────┼──────┼──────┼──────────────┤  │
│  │ 2025-10-17 10:00 | gestao→ │  150 │   0  │ ✓ Completo  │  │
│  │ 2025-10-17 09:55 | ←tabulad│  100 │   2  │ ⚠ Parcial  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌────────────────┬──────────────────────────┐                 │
│  │ Processar Fila │ Sincronizar Agora        │ ← Ações        │
│  └────────────────┴──────────────────────────┘                 │
└────────────────────────────────────────────────────────────────┘
```

## Legenda de Símbolos

- `↓` : Fluxo sequencial
- `↕` : Fluxo bidirecional
- `←` / `→` : Direção de dados
- `✓` : Operação bem-sucedida
- `⚠` : Aviso ou parcial
- `✅` : Validação passou
- `❌` : Erro ou falha

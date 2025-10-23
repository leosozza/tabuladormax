# Scouters Data Flow - Visual Guide

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Scouters Page Load                           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  getScoutersData()   │
                  │  (scoutersRepo.ts)   │
                  └──────────┬───────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │ fetchScoutersFromSheets()    │
              └──────────────┬───────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │  Try: Fetch from Scouters Tab          │
        │  (GoogleSheetsService.fetchScouters()) │
        └────────────┬───────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
   [Success]                 [Empty/Failed]
        │                         │
        │                         ├──> Fall back to
        │                         │    deriveScoutersFromFichas()
        │                         │
        ▼                         ▼
┌─────────────────┐      ┌─────────────────────┐
│ Scouters Tab    │      │ Group fichas by     │
│ Data Available  │      │ scouter name        │
└────────┬────────┘      └──────────┬──────────┘
         │                          │
         │ ┌────────────────────────┘
         │ │ Fetch fichas for enrichment
         │ │
         ▼ ▼
┌─────────────────────────────────────┐
│ enrichScoutersWithFichasData()      │
│                                     │
│ 1. Match scouters with fichas       │
│ 2. Calculate statistics:            │
│    - total_fichas                   │
│    - converted_fichas               │
│    - conversion_rate                │
│    - performance_status             │
│    - fichas_value                   │
│                                     │
└────────────────┬────────────────────┘
                 │
                 ▼
        ┌────────────────┐
        │ ScouterData[]  │
        │                │
        │ • 64 scouters  │
        │ • 64 active    │
        │ • 0 inactive   │
        └────────┬───────┘
                 │
                 ▼
        ┌────────────────┐
        │  Display in    │
        │  Scouters Page │
        └────────────────┘
```

## Column Mapping Flow

```
Scouters Sheet (GID 1351167110)
─────────────────────────────────
Column Names (flexible):
├─ Nome / Scouter / Nome do Scouter
├─ Tier / Classificação / Nivel
├─ Status / Situação / Ativo
└─ Meta Semanal / Meta / Meta/Semana

       │
       ▼
parseAtivo(status)
       │
       ├─ "inativo" ──> active: false
       ├─ "férias"  ──> active: false
       ├─ "ativo"   ──> active: true
       └─ [default] ──> active: true

       │
       ▼
ScouterFromTab
       │
       ├─ nome: string
       ├─ tier: string
       ├─ status: string
       ├─ meta_semanal: number
       └─ ativo: boolean
```

## Enrichment Process

```
Scouters Tab Data        Fichas Data
─────────────────        ───────────
Nome: "João Silva"       "Gestão de Scouter": "João Silva"
Tier: "Pleno"            Status: "Confirmado"
Status: "Ativo"          Valor: 150
Meta: 50                 [... more fichas]
                                │
                                │
        ┌───────────────────────┴───────────────┐
        │       Match by normalized name        │
        │    normalize("João Silva") ==         │
        │    normalize("João Silva")            │
        └───────────────────┬───────────────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │  Calculate Stats:    │
                 │  • total_fichas: 25  │
                 │  • converted: 20     │
                 │  • rate: 80%         │
                 │  • value: 3750       │
                 └──────────┬───────────┘
                            │
                            ▼
                    ScouterData {
                      id: "scouter-0"
                      scouter_name: "João Silva"
                      tier_name: "Pleno"
                      weekly_goal: 50
                      total_fichas: 25
                      converted_fichas: 20
                      conversion_rate: 80
                      fichas_value: 3750
                      performance_status: "Excelente"
                      active: true
                    }
```

## Active Status Detection Logic

```
Input: Status field value
       │
       ▼
Is lowercase status contains any of:
├─ "inativo"   ─┐
├─ "inativa"   ─┤
├─ "desligado" ─┤
├─ "desligada" ─┤
├─ "pausado"   ─┤
├─ "férias"    ─┼──> YES ──> active: false
├─ "ferias"    ─┤
└─ "afastado"  ─┘
       │
       NO
       │
       ▼
Contains "ativo"? ──> YES ──> active: true
       │
       NO
       │
       ▼
Default: active: true
```

## Fallback Flow

```
fetchScouters() returns empty
       │
       ▼
Log: "Scouters tab empty, falling back..."
       │
       ▼
deriveScoutersFromFichas()
       │
       ├─ Group all fichas by scouter name
       │
       ├─ Create scouter entry for each unique name
       │
       └─ Calculate stats from fichas
              │
              ▼
       ScouterData[] (all active: true)
```

## Error Handling

```
Try to fetch Scouters tab
       │
       ├─ CORS Error ────────┐
       ├─ Network Error ─────┤
       ├─ 404 Not Found ─────┼──> Log error
       └─ Parse Error ───────┘      │
              │                      │
              ▼                      ▼
    Return []            Fallback to deriveScoutersFromFichas()
              │                      │
              └──────────┬───────────┘
                         │
                         ▼
                 Still returns data
              (no breaking changes)
```

## Console Output Flow

```
Page Load
    │
    ├─> "GoogleSheetsService: Buscando scouters da aba dedicada..."
    │
    ├─> "GoogleSheetsService: Campos disponíveis: [Nome, Tier, ...]"
    │
    ├─> "GoogleSheetsService: Scouter 0: nome='João', tier='Pleno', ativo=true"
    │   "GoogleSheetsService: Scouter 1: nome='Maria', tier='Coach', ativo=true"
    │   "GoogleSheetsService: Scouter 2: nome='Pedro', tier='Pleno', ativo=false"
    │
    ├─> "GoogleSheetsService: 64 scouters processados da aba dedicada"
    │
    ├─> "GoogleSheetsService: Scouters ativos: 64"
    │
    ├─> "scoutersRepo: Using data from Scouters tab (64 scouters found)"
    │
    ├─> "scoutersRepo: Enriching 64 scouters with fichas data from 1250 fichas"
    │
    ├─> "scoutersRepo: Grouped fichas into 64 unique scouter names"
    │
    ├─> "scoutersRepo: Scouter 'João Silva' has 25 fichas, active=true"
    │   "scoutersRepo: Scouter 'Maria Santos' has 32 fichas, active=true"
    │   "scoutersRepo: Scouter 'Pedro Costa' has 0 fichas, active=false"
    │
    └─> "scoutersRepo: Enriched 64 scouters (64 active, 0 inactive)"
```

## Type Safety Flow

```
Raw CSV
  │
  ▼
CsvRow interface
  │ [key: string]: string | number | Date | boolean | ...
  │
  ▼
ScouterFromTab interface
  │ nome?: string
  │ tier?: string
  │ status?: string
  │ meta_semanal?: number
  │ ativo?: boolean
  │
  ▼
enrichScoutersWithFichasData()
  │ Input: ScouterFromTab[], FichaRecord[]
  │
  ▼
ScouterData interface
  │ id: string
  │ scouter_name: string
  │ tier_name: string
  │ weekly_goal: number
  │ fichas_value: number
  │ total_fichas: number
  │ converted_fichas: number
  │ conversion_rate: number
  │ performance_status: string
  │ active: boolean
  │
  ▼
Display in UI (fully typed)
```

## Key Points

1. **Two-tier strategy**: Primary (Scouters tab) + Fallback (fichas grouping)
2. **Enrichment**: Always combines with fichas data for statistics
3. **Flexible**: Accepts multiple column name variations
4. **Smart**: Detects active/inactive status intelligently
5. **Safe**: Falls back gracefully on errors
6. **Type-safe**: No `any` types, all properly typed
7. **Debuggable**: Comprehensive console logging
8. **Minimal**: < 1 kB bundle size increase

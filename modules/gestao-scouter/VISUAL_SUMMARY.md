# 🗺️ Área de Abordagem - Visual Summary

## Overview

This implementation adds **two separate interactive maps** to the Área de Abordagem page:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ÁREA DE ABORDAGEM                                │
│                                                                         │
│  [Enriquecer Geolocalização] ───────────────────────────────────────▶  │
│                                                                         │
│  ┌──────────────────────── FILTROS ─────────────────────────────────┐  │
│  │ [Data Início] [Data Fim] [Projeto ▼] [Scouter ▼]                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐                     │
│  │  Scouters Ativos    │  │  Pontos de Fichas   │                     │
│  │       12            │  │        234          │                     │
│  └─────────────────────┘  └─────────────────────┘                     │
│                                                                         │
│  ┌─────────────────────────────────┬─────────────────────────────────┐ │
│  │   MAPA 1: SCOUTERS (CLUSTER)   │   MAPA 2: HEATMAP DE FICHAS    │ │
│  │                                 │                                 │ │
│  │         ╔═══╗                   │              ████               │ │
│  │    🟡  ║ 5 ║  🟡                │            ██████               │ │
│  │  ╔═══╗ ╚═══╝                    │          ██████████             │ │
│  │  ║ 3 ║    👤 João                │        ██████████████           │ │
│  │  ╚═══╝    👤 Maria               │      ████████████████████       │ │
│  │         🟡                       │    🟢🟡🟡🔴🔴🔴🟡🟡🟢           │ │
│  │                                 │                                 │ │
│  │  [Centralizar]                  │  [Centralizar]                  │ │
│  └─────────────────────────────────┴─────────────────────────────────┘ │
│                                                                         │
│  ℹ️  Sobre os Mapas                                                    │
│  • Mapa de Scouters: Clusters amarelos que se separam ao aproximar    │
│  • Mapa de Calor: Vermelho = alta concentração de fichas              │
│  • Filtros afetam ambos os mapas simultaneamente                      │
└─────────────────────────────────────────────────────────────────────────┘
```

## Mapa 1: Scouters com Clustering

### Comportamento Visual

**Zoom Baixo (< 13):**
```
        ╔═══╗
    🟡  ║ 5 ║  🟡
  ╔═══╗ ╚═══╝
  ║ 3 ║         ╔════╗
  ╚═══╝     🟡  ║ 12 ║
                ╚════╝
```
- Clusters amarelos (#FFC107)
- Número indica quantidade de scouters
- Tamanhos: small (< 5), medium (5-9), large (≥10)

**Zoom Alto (≥ 13):**
```
    👤 João (Bronze)
    
    👤 Maria (Prata)        👤 Carlos (Ouro)
    
              👤 Ana (Bronze)
```
- Markers individuais coloridos por tier
- Tooltips permanentes com nomes
- Popups com detalhes ao clicar

### Cores por Tier

| Tier   | Cor     | Hex Code  | Visual |
|--------|---------|-----------|--------|
| Bronze | Marrom  | #CD7F32   | 🟤     |
| Prata  | Cinza   | #C0C0C0   | ⚪     |
| Ouro   | Dourado | #FFD700   | 🟡     |

### Marcador Individual

```
  ┌─────────────┐
  │   João      │ ← Tooltip (permanente em zoom alto)
  └─────┬───────┘
        │
     ╭──┴──╮
     │ 👤  │  ← Ícone de pessoa
     ╰──┬──╯
        │ ← Cor por tier
```

## Mapa 2: Heatmap de Fichas

### Gradiente de Intensidade

```
🟢 Verde  →  🟡 Amarelo  →  🟠 Laranja  →  🔴 Vermelho
│            │              │              │
│            │              │              └─ Alta Concentração
│            │              └────────────────── Concentração Média-Alta
│            └────────────────────────────────── Concentração Média
└─────────────────────────────────────────────── Baixa Concentração
```

### Visualização

**Baixa Densidade:**
```
  🟢 🟢
      🟢  🟢
  🟢      🟢
```

**Média Densidade:**
```
  🟡🟡🟡
  🟡🟡🟡
  🟡🟡🟡
```

**Alta Densidade:**
```
  🔴🔴🔴🔴🔴
  🔴🔴🔴🔴🔴
  🔴🔴🔴🔴🔴
  🔴🔴🔴🔴🔴
```

## Filtros e Interações

### Filtros Disponíveis

```
┌─────────────────────────────────────────────────────────┐
│  FILTROS                                                │
├─────────────┬─────────────┬──────────────┬──────────────┤
│ 📅 Início   │ 📅 Fim      │ 📁 Projeto  │ 👥 Scouter  │
│ 2024-01-01  │ 2024-01-31  │ Todos ▼     │ Todos ▼     │
└─────────────┴─────────────┴──────────────┴──────────────┘
```

### Como Afetam os Mapas

| Filtro      | Mapa Scouters | Mapa Fichas |
|-------------|---------------|-------------|
| **Período** | ❌ Não afeta  | ✅ Filtra   |
| **Projeto** | ❌ Não afeta  | ✅ Filtra   |
| **Scouter** | ✅ Filtra     | ✅ Filtra   |

## Estatísticas em Tempo Real

### Card 1: Scouters Ativos
```
┌──────────────────────────┐
│ 👥 Scouters Ativos       │
│                          │
│        12                │
│                          │
│ ≤10 minutos desde update │
└──────────────────────────┘
```

**Lógica:**
```javascript
activeScouters = locations.filter(loc => {
  const minutesAgo = (now - loc.at) / 60000;
  return minutesAgo <= 10;
}).length;
```

### Card 2: Pontos de Fichas
```
┌──────────────────────────┐
│ 🔥 Pontos de Fichas      │
│                          │
│       234                │
│                          │
│ No período selecionado   │
└──────────────────────────┘
```

**Lógica:**
```javascript
totalFichas = fichasGeo.length;
// Atualiza conforme filtros mudam
```

## Fluxo de Dados

### 1. Carregamento Inicial

```
[Página] → [useScoutersLastLocations Hook]
              ↓
         [Supabase RPC: get_scouters_last_locations]
              ↓
         [Renderiza Mapa 1 com Clusters]
              
[Página] → [useFichasGeo Hook]
              ↓
         [Supabase RPC: get_fichas_geo]
              ↓
         [Renderiza Mapa 2 com Heatmap]
```

### 2. Realtime Updates

```
[Supabase Realtime]
       ↓
[INSERT em scouter_locations]
       ↓
[Hook refetch automaticamente]
       ↓
[Mapa 1 atualiza markers]


[Supabase Realtime]
       ↓
[UPDATE lat/lng em fichas]
       ↓
[Hook refetch automaticamente]
       ↓
[Mapa 2 atualiza heatmap]
```

### 3. Filtros

```
[Usuário altera filtro]
       ↓
[Estado local atualiza]
       ↓
[Props mudam nos componentes]
       ↓
[useEffect detecta mudança]
       ↓
[Nova query ao Supabase]
       ↓
[Mapas re-renderizam]
```

## Responsividade

### Desktop (≥1024px)
```
┌─────────────────────────────────────────────────┐
│ Header + Filtros                                │
├─────────────────────┬───────────────────────────┤
│                     │                           │
│   Mapa Scouters     │    Mapa Heatmap          │
│                     │                           │
│   (50% width)       │    (50% width)           │
│                     │                           │
└─────────────────────┴───────────────────────────┘
```

### Tablet/Mobile (<1024px)
```
┌─────────────────────────────────┐
│ Header + Filtros                │
├─────────────────────────────────┤
│                                 │
│      Mapa Scouters              │
│      (100% width)               │
│                                 │
├─────────────────────────────────┤
│                                 │
│      Mapa Heatmap               │
│      (100% width)               │
│                                 │
└─────────────────────────────────┘
```

## Interações do Usuário

### 1. Zoom no Mapa de Scouters

```
Zoom Baixo (7-12)         Zoom Médio (13-15)      Zoom Alto (16+)
─────────────────         ──────────────────      ──────────────
   ╔═══╗                      👤 João                👤 João
   ║ 5 ║        →            👤 Maria      →        (nome sempre
   ╚═══╝                      👤 Ana                 visível)
 (cluster)                (markers)              (tooltips fixos)
```

### 2. Clicar em Cluster

```
Antes                     Após clicar
──────                    ────────────
   ╔═══╗                     👤 👤
   ║ 5 ║        →            👤 👤 👤
   ╚═══╝                    (zoom in + separa)
```

### 3. Clicar em Marker

```
Antes                     Após clicar
──────                    ────────────
   👤 João                ┌─────────────────┐
                   →      │ João Silva      │
                          │ Tier: Ouro      │
                          │ Atualizado há   │
                          │ 3 minutos       │
                          └─────────────────┘
```

### 4. Hover em Heatmap

```
[Nenhuma interação específica]
Heatmap é visualização estática da densidade
```

## Performance

### Otimizações Implementadas

1. **Chunked Loading**: Clusters carregam incrementalmente
2. **React Query Caching**: 
   - Scouters: 30s stale time
   - Fichas: 60s stale time
3. **Realtime Debouncing**: Evita re-renders excessivos
4. **Client-side Filtering**: Scouter filter não requer novo fetch

### Métricas Esperadas

| Ação                    | Tempo      |
|-------------------------|------------|
| Carregamento inicial    | < 2s       |
| Mudança de filtro       | < 500ms    |
| Zoom in/out            | Instantâneo |
| Clique em cluster      | < 200ms    |
| Realtime update        | 1-3s       |

## Teclas de Atalho (Padrão Leaflet)

```
[+]          → Zoom in
[-]          → Zoom out
[Shift+Drag] → Desenhar retângulo de zoom
[Double Click] → Zoom in centrado
```

## Estados de UI

### Loading
```
┌─────────────────────────┐
│                         │
│       ⏳ Carregando...  │
│                         │
└─────────────────────────┘
```

### Erro
```
┌─────────────────────────┐
│                         │
│  ⚠️ Erro ao carregar    │
│     dados do mapa       │
│                         │
└─────────────────────────┘
```

### Vazio
```
┌─────────────────────────┐
│                         │
│  [Mapa vazio]           │
│  Nenhum dado disponível │
│                         │
└─────────────────────────┘
```

## Componentes Criados

### ScoutersClusterMap.tsx
```typescript
interface ScoutersClusterMapProps {
  scouter?: string | null; // Filtro opcional
}

// Features:
// - Leaflet Map com OSM tiles
// - MarkerClusterGroup
// - Custom icons por tier
// - Dynamic tooltips
// - Realtime subscriptions
```

### Modificações em AreaDeAbordagem.tsx
```typescript
// Added:
// - Filter state management
// - Two-column layout
// - Real-time stats calculation
// - Supabase filter loading
// - Geocoding enrichment button
```

## Próximos Passos

### Melhorias Futuras (Não incluídas)

1. **Trail de Movimento**
   ```
   👤 ─── ─── ─── ─── ─── 📍
   (histórico de 24h do scouter)
   ```

2. **Desenho de Áreas**
   ```
   ┌─────────────┐
   │   Área 1    │  ← Polígono definido pelo usuário
   │   (SP Zone) │
   └─────────────┘
   ```

3. **Notificações**
   ```
   🔔 João entrou na Área 1
   🔔 Alta concentração de fichas em SP Zone
   ```

4. **Exportação**
   ```
   [Export KML] [Export GeoJSON] [Export CSV]
   ```

## Troubleshooting Visual

### Problema: Clusters não aparecem
```
❌ Erro                    ✅ Solução
──────────────            ─────────────
[Mapa vazio]       →      Verificar:
                          1. Dados em scouters?
                          2. CSS importado?
                          3. leaflet.markercluster instalado?
```

### Problema: Heatmap todo verde
```
❌ Erro                    ✅ Solução
──────────────            ─────────────
🟢🟢🟢🟢🟢              Verificar:
🟢🟢🟢🟢🟢     →         1. Múltiplas fichas próximas?
🟢🟢🟢🟢🟢              2. lat/lng válidos?
                          3. Ajustar configuração gradient
```

### Problema: Tooltips não aparecem
```
❌ Erro                    ✅ Solução
──────────────            ─────────────
👤 João             →     1. Zoom >= 13?
(sem nome)                2. Event listener ativo?
                          3. CSS .scouter-name-tooltip?
```

---

## Legenda de Ícones

| Ícone | Significado          |
|-------|---------------------|
| 🟡    | Cluster amarelo     |
| 👤    | Marker de scouter   |
| 🟢    | Baixa densidade     |
| 🟡    | Média densidade     |
| 🔴    | Alta densidade      |
| 📅    | Filtro de data      |
| 📁    | Filtro de projeto   |
| 👥    | Filtro de scouter   |
| 🔥    | Pontos de calor     |
| ⏳    | Carregando          |
| ⚠️    | Erro                |
| ✅    | Sucesso             |
| 🔔    | Notificação         |

---

**Fim do Visual Summary** 🗺️

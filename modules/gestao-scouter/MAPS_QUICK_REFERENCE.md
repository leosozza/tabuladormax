# Guia Rápido: Mapas Gratuitos - Gestão Scouter

## 🚀 TL;DR - Solução Atual

**Stack:** Leaflet.js + OpenStreetMap + leaflet.heat  
**Custo:** R$ 0,00 (100% gratuito)  
**Performance:** Excelente para uso interno  
**Manutenção:** Zero configuração necessária  

---

## 📦 Dependências Instaladas

```json
{
  "leaflet": "^1.9.4",                // Biblioteca de mapas (MIT)
  "leaflet.heat": "^0.2.0",           // Plugin de heatmap (MIT)
  "@types/leaflet": "^1.9.20"         // TypeScript types
}
```

**Total:** ~45KB minificado + gzipped

---

## 🗺️ Tile Servers Gratuitos

### 1. OpenStreetMap (padrão, recomendado)
```typescript
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 19,
});
```
- ✅ Totalmente gratuito
- ✅ Sem API key
- ✅ Uso ilimitado (fair-use)

### 2. CARTO Light (minimalista)
```typescript
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
  attribution: '© CARTO',
  maxZoom: 19,
});
```
- ✅ Gratuito até 75k views/mês
- ✅ Design clean
- 🎨 Perfeito para dashboards

### 3. CARTO Dark (tema escuro)
```typescript
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
  attribution: '© CARTO',
  maxZoom: 19,
});
```
- ✅ Mesmo limite do Light
- 🌙 Dark mode

### 4. OpenStreetMap.fr (colorido)
```typescript
L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap France',
  maxZoom: 20,
});
```
- ✅ Gratuito ilimitado
- 🎨 Mais colorido e detalhado

---

## 🔧 Como Trocar o Tile Server

### Método 1: Editar diretamente no componente

Arquivo: `src/components/map/UnifiedMap.tsx` (linha ~107)

```typescript
// Trocar de:
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 19,
}).addTo(map);

// Para:
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
  attribution: '© CARTO',
  maxZoom: 19,
}).addTo(map);
```

### Método 2: Criar variável de ambiente (recomendado)

**1. Adicionar no `.env`:**
```env
VITE_MAP_TILE_URL=https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png
VITE_MAP_ATTRIBUTION=© CARTO
```

**2. Usar no componente:**
```typescript
L.tileLayer(
  import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    attribution: import.meta.env.VITE_MAP_ATTRIBUTION || '© OpenStreetMap',
    maxZoom: 19,
  }
).addTo(map);
```

**Benefício:** Trocar tile server sem alterar código

---

## 🎨 Customizar Cores do Heatmap

Arquivo: `src/components/map/UnifiedMap.tsx` (linha ~212) ou `FichasHeatmap.tsx` (linha ~83)

```typescript
// Gradiente atual (verde → amarelo → vermelho)
gradient: {
  0.0: 'green',
  0.5: 'yellow',
  1.0: 'red'
}

// Alternativas:

// Azul → Vermelho (clássico)
gradient: {
  0.0: 'blue',
  0.5: 'cyan',
  1.0: 'red'
}

// Preto e Branco
gradient: {
  0.0: 'white',
  0.5: 'gray',
  1.0: 'black'
}

// Rainbow
gradient: {
  0.0: 'blue',
  0.2: 'cyan',
  0.4: 'lime',
  0.6: 'yellow',
  0.8: 'orange',
  1.0: 'red'
}
```

### Ajustar Intensidade

```typescript
L.heatLayer(points, {
  radius: 25,      // ⬆️ Aumentar = área maior
  blur: 15,        // ⬆️ Aumentar = mais suave
  maxZoom: 17,     // Zoom máximo de intensidade
  max: 1.0,        // ⬆️ Aumentar = menos intenso
  minOpacity: 0.25, // ✅ IMPORTANTE: Opacidade mínima (garante visibilidade em todos os zooms)
});
```

**💡 Dica**: O parâmetro `minOpacity` é essencial para garantir que o heatmap permaneça visível mesmo em zooms distantes. Valores recomendados: 0.2 - 0.3

---

## 🎯 Customizar Markers de Scouters

Arquivo: `src/components/map/UnifiedMap.tsx` (linha ~30)

### Cores dos Tiers (atuais)
```typescript
const TIER_COLORS = {
  'Bronze': '#CD7F32',  // Marrom
  'Prata': '#C0C0C0',   // Cinza
  'Ouro': '#FFD700',    // Dourado
  'default': '#3B82F6', // Azul
};
```

### Trocar para cores personalizadas
```typescript
const TIER_COLORS = {
  'Bronze': '#8B4513',  // Marrom escuro
  'Prata': '#E5E5E5',   // Cinza claro
  'Ouro': '#FFA500',    // Laranja dourado
  'default': '#6366F1', // Indigo
};
```

### Trocar ícone de pessoa para pin
```typescript
function createMarkerIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 25px;
        height: 40px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      "></div>
    `,
    iconSize: [25, 40],
    iconAnchor: [12, 40],
    popupAnchor: [0, -40],
  });
}
```

---

## 🔌 Integrações Disponíveis

### 1. Google Sheets → Localizações (Edge Function)

**Endpoint:** `/functions/v1/sheets-locations-sync`

```bash
curl -X POST \
  https://SEU_PROJETO.supabase.co/functions/v1/sheets-locations-sync \
  -H "X-Secret: seu_segredo"
```

**Formato do Grid 1351167110:**
```
| scouter       | coords_raw                    | tier   |
|---------------|-------------------------------|--------|
| João Silva    | -23.5505,-46.6333            | Ouro   |
| Maria Santos  | -23.5491761,-46.6881783 (, ) | Prata  |
```

### 2. Geocoding de Endereços (Edge Function)

**Endpoint:** `/functions/v1/fichas-geo-enrich`

```bash
curl -X POST \
  "https://SEU_PROJETO.supabase.co/functions/v1/fichas-geo-enrich?limit=50" \
  -H "X-Secret: seu_segredo"
```

**Converte endereços em coordenadas:**
- "Av. Paulista, 1000, São Paulo" → `-23.5505, -46.6333`
- Cache automático para evitar chamadas repetidas
- Rate limit: 1 req/segundo (Nominatim)

---

## 📊 Componentes Disponíveis

### UnifiedMap (recomendado)
```tsx
import { UnifiedMap } from '@/components/map/UnifiedMap';

<UnifiedMap 
  startDate="2024-01-01"
  endDate="2024-12-31"
  project="Projeto A"
  scouter="João Silva"
/>
```

**Features:**
- Toggle entre Scouters e Fichas
- Filtros de período/projeto/scouter
- Botão centralizar
- Contadores em tempo real

### ScouterLiveMap (só scouters)
```tsx
import { ScouterLiveMap } from '@/components/map/ScouterLiveMap';

<ScouterLiveMap />
```

**Features:**
- Apenas posições de scouters
- Markers coloridos por tier
- Contador de ativos (≤10 min)

### FichasHeatmap (só fichas)
```tsx
import { FichasHeatmap } from '@/components/map/FichasHeatmap';

<FichasHeatmap 
  startDate="2024-01-01"
  endDate="2024-12-31"
/>
```

**Features:**
- Apenas heatmap de fichas
- Gradiente de cores
- Contador de pontos

---

## 🎮 Controles do Mapa

### Zoom Programático
```typescript
map.setZoom(15); // Zoom específico (0-19)
map.zoomIn();    // +1 zoom
map.zoomOut();   // -1 zoom
```

### Centralizar em Coordenada
```typescript
map.setView([-23.5505, -46.6333], 13); // lat, lng, zoom
map.flyTo([-23.5505, -46.6333], 13);   // Animado
```

### Ajustar para Múltiplos Pontos
```typescript
const bounds = L.latLngBounds(
  [[-23.5, -46.7], [-23.6, -46.5]]
);
map.fitBounds(bounds, { padding: [50, 50] });
```

### Eventos
```typescript
map.on('click', (e) => {
  console.log('Clicou em:', e.latlng);
});

map.on('zoomend', () => {
  console.log('Zoom atual:', map.getZoom());
});

map.on('moveend', () => {
  console.log('Centro atual:', map.getCenter());
});
```

---

## 🐛 Troubleshooting

### Mapas não aparecem
```typescript
// ✅ Verificar se CSS está importado
import 'leaflet/dist/leaflet.css';

// ✅ Verificar se container tem altura
<div ref={mapContainerRef} className="h-[500px]" />
```

### Tiles não carregam
```typescript
// 🔧 Tentar tile server alternativo
L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png');

// 🔧 Limpar cache do browser
// DevTools → Application → Clear storage
```

### Performance ruim
```typescript
// 🚀 Reduzir número de pontos no heatmap
const limitedPoints = allPoints.slice(0, 5000);

// 🚀 Aumentar staleTime do React Query
staleTime: 60_000, // 1 minuto
```

---

## 📈 Métricas de Performance

| Ação | Tempo | Tamanho |
|------|-------|---------|
| Carregar tiles (10) | ~500ms | ~200KB |
| Renderizar 1000 markers | ~200ms | - |
| Renderizar 5000 pontos (heatmap) | ~150ms | - |
| Update em tempo real | <100ms | - |

**Otimizações implementadas:**
- ✅ React Query cache (30-60s)
- ✅ Lazy loading do componente
- ✅ Índices no banco de dados
- ✅ Cache de geocoding (tabela `geocache`)

---

## 🔐 Segurança e Privacidade

### OpenStreetMap
- ✅ Não rastreia usuários
- ✅ Não coleta dados pessoais
- ✅ GDPR compliant
- ✅ Sem cookies de terceiros

### Dados dos Scouters
- ✅ Armazenados no Supabase (seu controle)
- ✅ Não compartilhados com terceiros
- ✅ Coordenadas não enviadas para OSM
- ✅ Logs apenas no seu servidor

---

## 💡 Dicas de Uso

### 1. Cachear tiles offline (PWA)
```typescript
// service-worker.js
const TILE_CACHE = 'map-tiles-v1';

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
```

### 2. Tooltip ao invés de Popup
```typescript
marker.bindTooltip('João Silva', {
  permanent: false,
  direction: 'top'
});
```

### 3. Animação de markers
```typescript
marker.setLatLng(newLatLng); // Move instantaneamente

// OU animar com CSS
marker.setLatLng(newLatLng);
marker.getElement().style.transition = 'all 1s ease';
```

### 4. Exportar mapa como imagem
```bash
npm install leaflet-image
```
```typescript
import leafletImage from 'leaflet-image';

leafletImage(map, (err, canvas) => {
  const img = canvas.toDataURL();
  // Download ou salvar
});
```

---

## 📚 Recursos Adicionais

### Documentação
- [Leaflet API Reference](https://leafletjs.com/reference.html)
- [Leaflet Tutorials](https://leafletjs.com/examples.html)
- [OSM Wiki](https://wiki.openstreetmap.org/)

### Plugins Úteis
- **leaflet.markercluster** - Agrupar markers próximos
- **leaflet-draw** - Desenhar polígonos/linhas
- **leaflet-routing-machine** - Rotas entre pontos
- **leaflet-fullscreen** - Botão de fullscreen

### Alternativas Tile Servers
- [Leaflet Provider Preview](https://leaflet-extras.github.io/leaflet-providers/preview/)
- Lista completa de 100+ tile servers gratuitos

---

## ⚡ Comandos Rápidos

```bash
# Instalar dependências
npm install leaflet leaflet.heat @types/leaflet

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Deploy Edge Functions
supabase functions deploy sheets-locations-sync
supabase functions deploy fichas-geo-enrich

# Aplicar migrations
supabase db push
```

---

## 🎯 Próximos Passos

- [ ] Implementar clustering para áreas densas
- [ ] Adicionar layer switcher (controle de camadas)
- [ ] Exportar área como KML/GeoJSON
- [ ] Adicionar filtros de tier no mapa
- [ ] Implementar drawing tools
- [ ] Histórico de movimento (trail)

---

**✅ Pronto para uso! Todos os mapas estão 100% gratuitos e funcionais.**

Para documentação completa, consulte: [MAPS_SOLUTION.md](./MAPS_SOLUTION.md)

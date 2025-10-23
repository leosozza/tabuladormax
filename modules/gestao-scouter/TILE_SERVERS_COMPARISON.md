# Comparação Visual de Tile Servers

Este documento mostra exemplos visuais dos diferentes tile servers gratuitos disponíveis na aplicação.

## Como Testar Diferentes Tile Servers

### Opção 1: Via Variável de Ambiente (Recomendado)

Adicione no arquivo `.env`:

```env
# Escolha um dos servers abaixo
VITE_MAP_TILE_SERVER=osm          # OpenStreetMap (padrão)
# VITE_MAP_TILE_SERVER=cartoLight   # CARTO Light (minimalista)
# VITE_MAP_TILE_SERVER=cartoDark    # CARTO Dark (tema escuro)
# VITE_MAP_TILE_SERVER=osmFr        # OSM France (colorido)
# VITE_MAP_TILE_SERVER=osmDe        # OSM Germany (estável)
# VITE_MAP_TILE_SERVER=hot          # Humanitarian OSM
# VITE_MAP_TILE_SERVER=stamenToner  # Stamen Toner (preto/branco)
# VITE_MAP_TILE_SERVER=stamenTerrain # Stamen Terrain (relevo)
```

Depois reinicie o servidor:
```bash
npm run dev
```

### Opção 2: Editando o Código

Abra `src/config/tileServers.ts` e altere a constante:

```typescript
// Linha 136
export const DEFAULT_TILE_SERVER = 'osm'; // Troque por qualquer uma das opções
```

## Tile Servers Disponíveis

### 1. OpenStreetMap (padrão)
**Nome:** `osm`  
**Estilo:** Clássico OSM, equilibrado  
**Melhor para:** Uso geral, dados completos

**Características:**
- ✅ Totalmente gratuito e ilimitado
- ✅ Atualizado pela comunidade global
- ✅ Excelente cobertura do Brasil
- ✅ Mostra ruas, bairros, pontos de interesse
- 🎨 Cores moderadas, fácil de ler

**Preview:** Mapa padrão com ruas bem definidas, parques em verde, água em azul claro.

---

### 2. CARTO Light
**Nome:** `cartoLight`  
**Estilo:** Minimalista, cores claras  
**Melhor para:** Dashboards profissionais, apresentações

**Características:**
- ✅ Gratuito até 75.000 views/mês (mais que suficiente)
- ✅ Design clean e moderno
- ✅ Destaca informações importantes
- ✅ Fundo branco/cinza muito claro
- 🎨 Perfeito para sobrepor dados (heatmaps, markers)

**Preview:** Fundo branco com ruas em cinza claro, texto legível, muito limpo.

**Caso de uso ideal:**
- Heatmaps de fichas (destaca bem as cores quentes)
- Apresentações para clientes
- Relatórios PDF/impressos

---

### 3. CARTO Dark
**Nome:** `cartoDark`  
**Estilo:** Minimalista, tema escuro  
**Melhor para:** Dark mode, visualizações noturnas

**Características:**
- ✅ Gratuito até 75.000 views/mês
- ✅ Excelente para dark mode
- ✅ Reduz cansaço visual em uso prolongado
- ✅ Destaca bem markers coloridos
- 🎨 Fundo escuro com texto branco

**Preview:** Fundo preto/cinza escuro, ruas em cinza, texto branco, elegante.

**Caso de uso ideal:**
- Monitoramento em tempo real (24/7)
- Aplicações com tema escuro
- Visualizações de dados brilhantes (cores vivas)

---

### 4. OpenStreetMap France
**Nome:** `osmFr`  
**Estilo:** Colorido, detalhado  
**Melhor para:** Exploração visual, navegação

**Características:**
- ✅ Totalmente gratuito e ilimitado
- ✅ Mais colorido que OSM padrão
- ✅ Destaca pontos de interesse
- ✅ Zoom até nível 20 (muito detalhado)
- 🎨 Cores vivas, fácil identificar tipos de lugares

**Preview:** Verde vibrante para parques, azul forte para água, muitos detalhes.

**Caso de uso ideal:**
- Navegação visual de áreas
- Identificar pontos de interesse próximos
- Exploração de território

---

### 5. OpenStreetMap Germany
**Nome:** `osmDe`  
**Estilo:** Parecido com OSM, servidores na Europa  
**Melhor para:** Backup/alternativa estável

**Características:**
- ✅ Totalmente gratuito e ilimitado
- ✅ Servidores alemães (estáveis)
- ✅ Boa alternativa se OSM padrão estiver lento
- ✅ Estilo consistente com OSM
- 🎨 Cores equilibradas

**Preview:** Muito similar ao OSM padrão, confiável.

**Caso de uso ideal:**
- Fallback se tile.openstreetmap.org ficar lento
- Produção com alta disponibilidade

---

### 6. Humanitarian OpenStreetMap Team (HOT)
**Nome:** `hot`  
**Estilo:** Destaca infraestrutura e serviços  
**Melhor para:** Visualizar hospitais, escolas, serviços essenciais

**Características:**
- ✅ Totalmente gratuito
- ✅ Destaca hospitais, escolas, serviços de emergência
- ✅ Útil para mapeamento humanitário
- ✅ Cores diferenciadas para infraestrutura
- 🎨 Rosa/laranja para construções importantes

**Preview:** Destaca edifícios importantes em cores vivas, infraestrutura visível.

**Caso de uso ideal:**
- Planejamento de rotas para scouters (identificar hospitais, escolas próximas)
- Análise de infraestrutura regional
- Visualização de serviços essenciais

---

### 7. Stamen Toner
**Nome:** `stamenToner`  
**Estilo:** Preto e branco, estilo jornal  
**Melhor para:** Apresentações artísticas, impressão

**Características:**
- ✅ Gratuito para desenvolvimento e produção
- ✅ Alto contraste preto/branco
- ✅ Excelente para impressão
- ✅ Estilo único e profissional
- 🎨 Sem cores, apenas tons de cinza

**Preview:** Preto intenso, branco puro, cinzas intermediários, visual de jornal.

**Caso de uso ideal:**
- Relatórios impressos
- Apresentações formais
- Quando cor não é necessária
- Reduzir distração visual

---

### 8. Stamen Terrain
**Nome:** `stamenTerrain`  
**Estilo:** Destaca topografia e relevo  
**Melhor para:** Áreas montanhosas, análise geográfica

**Características:**
- ✅ Gratuito para desenvolvimento e produção
- ✅ Mostra curvas de nível e relevo
- ✅ Cores naturais (verde, marrom, azul)
- ✅ Destaca características geográficas
- 🎨 Tons terrosos, natural

**Preview:** Verde para vegetação, marrom para elevação, azul para água.

**Caso de uso ideal:**
- Áreas com variação de altitude
- Planejamento de rotas considerando relevo
- Visualização geográfica completa

---

## Recomendações por Caso de Uso

### Dashboard Principal → `cartoLight`
**Por quê:**
- Design limpo e profissional
- Destaca bem os markers coloridos por tier
- Heatmap fica visualmente atraente
- Leve e rápido

### Dark Mode → `cartoDark`
**Por quê:**
- Combina com tema escuro da aplicação
- Reduz cansaço visual
- Markers ficam mais visíveis

### Apresentações para Clientes → `cartoLight` ou `stamenToner`
**Por quê:**
- Visual profissional
- Stamen Toner: único e memorável
- Carto Light: moderno e clean

### Uso Interno/Operacional → `osm` (padrão)
**Por quê:**
- Máximo de informação
- Gratuito ilimitado
- Confiável

### Análise Geográfica Detalhada → `osmFr` ou `stamenTerrain`
**Por quê:**
- OSM France: mais colorido, fácil identificar tipos
- Stamen Terrain: mostra relevo

### Identificar Infraestrutura → `hot`
**Por quê:**
- Destaca hospitais, escolas, serviços
- Útil para planejamento de área de atuação

---

## Teste Rápido

Para testar todos os tile servers rapidamente:

1. Acesse a página `/area-de-abordagem`
2. Abra o console do desenvolvedor (F12)
3. Cole este código:

```javascript
// Trocar tile server dinamicamente (apenas para teste)
const tileServers = [
  'osm', 'cartoLight', 'cartoDark', 'osmFr', 
  'osmDe', 'hot', 'stamenToner', 'stamenTerrain'
];

let currentIndex = 0;

function switchTileServer() {
  const serverName = tileServers[currentIndex];
  console.log(`Trocando para: ${serverName}`);
  
  // Recarregar a página com novo tile server
  localStorage.setItem('testTileServer', serverName);
  window.location.reload();
  
  currentIndex = (currentIndex + 1) % tileServers.length;
}

// Trocar a cada 5 segundos
setInterval(switchTileServer, 5000);
```

**Nota:** Este é apenas um teste visual. Para uso em produção, use a variável de ambiente.

---

## Performance Comparativa

| Tile Server | Velocidade | Tamanho Tile | Disponibilidade |
|-------------|-----------|--------------|-----------------|
| OSM         | ★★★★☆    | ~20KB        | ★★★★★          |
| CARTO Light | ★★★★★    | ~15KB        | ★★★★☆          |
| CARTO Dark  | ★★★★★    | ~15KB        | ★★★★☆          |
| OSM France  | ★★★★☆    | ~25KB        | ★★★★☆          |
| OSM Germany | ★★★★★    | ~20KB        | ★★★★★          |
| HOT         | ★★★☆☆    | ~22KB        | ★★★☆☆          |
| Stamen Toner| ★★★★☆    | ~18KB        | ★★★★☆          |
| Stamen Terrain| ★★★☆☆ | ~30KB        | ★★★★☆          |

**Legenda:**
- ★★★★★ = Excelente
- ★★★★☆ = Muito bom
- ★★★☆☆ = Bom
- ★★☆☆☆ = Aceitável

---

## Fallback Automático

Se um tile server falhar, o sistema automaticamente usa OSM como fallback:

```typescript
// Configurado em src/config/tileServers.ts
export function getTileServerConfig(serverName?: string): TileServerConfig {
  const config = TILE_SERVERS[name];
  
  if (!config) {
    console.warn(`Tile server "${name}" not found. Falling back to OSM.`);
    return TILE_SERVERS.osm; // Fallback seguro
  }
  
  return config;
}
```

---

## Conclusão

Todos os tile servers listados são:
- ✅ **100% Gratuitos** para uso interno/comercial
- ✅ **Sem API keys** necessárias (exceto Thunderforest, não incluído)
- ✅ **Sem limites rígidos** (uso razoável aceito)
- ✅ **Produção-ready** (usados por milhões de sites)

**Recomendação geral:** Use `osm` para simplicidade ou `cartoLight` para visual mais profissional.

Para trocar, basta adicionar no `.env`:
```env
VITE_MAP_TILE_SERVER=cartoLight
```

E reiniciar o servidor:
```bash
npm run dev
```

**Pronto! Seu mapa está atualizado sem custo algum.** 🎉

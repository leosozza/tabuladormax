# Módulo Fichas - Visualização e Análise Espacial

## Visão Geral

Este módulo implementa funcionalidades completas para visualização e análise espacial de fichas no mapa, incluindo:

- **Heatmap Persistente**: Visualização de densidade que permanece visível em todos os níveis de zoom
- **Seleção Espacial**: Seleção de fichas por área usando retângulo ou polígono
- **Resumo Estatístico**: Agregação automática por projeto e scouter
- **Fonte de Dados**: Tabela 'fichas' do Supabase (migrado do Google Sheets)

## Estrutura dos Módulos

### 📦 `data.ts` - Carregamento e Manipulação de Dados

Responsável por carregar e processar dados de fichas do Google Sheets.

**Principais Funções:**
- `loadFichasData()` - Carrega fichas do Google Sheets
- `filterFichasByBounds()` - Filtra fichas por limites geográficos
- `groupByProjeto()` - Agrupa fichas por projeto
- `groupByScouter()` - Agrupa fichas por scouter

**Tipos:**
```typescript
interface FichaDataPoint {
  lat: number;
  lng: number;
  localizacao: string;
  id?: string;
  projeto?: string;
  scouter?: string;
  data?: string;
}
```

### 🔥 `heat.ts` - Heatmap Dinâmico

Gerencia a camada de heatmap usando leaflet.heat com persistência em todos os zooms.

**Classe Principal:**
```typescript
class FichasHeatmap {
  constructor(map: L.Map, options?: HeatmapOptions)
  updateData(fichas: FichaDataPoint[]): void
  clear(): void
  fitBounds(padding?: [number, number]): void
  updateOptions(options: Partial<HeatmapOptions>): void
  destroy(): void
}
```

**Configuração Padrão:**
```typescript
{
  radius: 25,         // Raio de cada ponto em pixels
  blur: 15,           // Nível de blur do gradiente
  maxZoom: 18,        // Zoom máximo onde heatmap é visível
  max: 1.0,           // Intensidade máxima
  gradient: {         // Gradiente de cores
    0.0: 'green',     // Baixa densidade
    0.5: 'yellow',    // Média densidade
    1.0: 'red'        // Alta densidade
  }
}
```

### 📐 `selection.ts` - Seleção Espacial

Implementa ferramentas de desenho para seleção de área com filtro espacial usando Turf.js.

**Classe Principal:**
```typescript
class FichasSelection {
  constructor(
    map: L.Map,
    fichas: FichaDataPoint[],
    onSelectionComplete?: (result: SelectionResult) => void
  )
  startRectangleSelection(): void
  startPolygonSelection(): void
  clearSelection(): void
  cancelSelection(): void
  destroy(): void
}
```

**Tipos:**
```typescript
interface SelectionResult {
  shape: 'rectangle' | 'polygon';
  fichas: FichaDataPoint[];
  bounds: L.LatLngBounds | null;
  polygon: L.LatLng[] | null;
}
```

**Modos de Seleção:**
1. **Retângulo**: Clique e arraste para desenhar
2. **Polígono**: Cliques para adicionar vértices, duplo clique para finalizar

### 📊 `summary.ts` - Resumo Estatístico

Gera estatísticas agregadas por projeto e scouter.

**Principais Funções:**
```typescript
function generateSummary(fichas: FichaDataPoint[]): FichasSummaryData
function formatSummaryText(summary: FichasSummaryData): string
function generateSummaryHTML(summary: FichasSummaryData): string
function compareSummaries(before, after): ComparisonResult
```

**Tipos:**
```typescript
interface FichasSummaryData {
  total: number;
  byProjeto: ProjetoSummary[];
  byScouter: ScouterSummary[];
  topProjeto: ProjetoSummary | null;
  topScouter: ScouterSummary | null;
}

interface ProjetoSummary {
  projeto: string;
  count: number;
  percentage: number;
}
```

## Exemplo de Uso Completo

### 1. Inicialização Básica

```typescript
import { 
  loadFichasData, 
  createFichasHeatmap, 
  createFichasSelection,
  generateSummary 
} from '@/map/fichas';
import L from 'leaflet';

// Criar mapa
const map = L.map('map').setView([-23.5505, -46.6333], 11);

// Carregar dados
const { fichas } = await loadFichasData();

// Criar heatmap
const heatmap = createFichasHeatmap(map);
heatmap.updateData(fichas);
heatmap.fitBounds();
```

### 2. Implementação com Seleção

```typescript
// Callback para quando seleção for completada
const handleSelectionComplete = (result) => {
  console.log(`Selecionadas ${result.fichas.length} fichas`);
  
  // Atualizar heatmap com fichas selecionadas
  heatmap.updateData(result.fichas);
  
  // Gerar resumo
  const summary = generateSummary(result.fichas);
  console.log(formatSummaryText(summary));
};

// Criar ferramenta de seleção
const selection = createFichasSelection(map, fichas, handleSelectionComplete);

// Iniciar seleção por retângulo
selection.startRectangleSelection();

// Ou por polígono
selection.startPolygonSelection();

// Cancelar seleção
selection.cancelSelection();

// Limpar seleção
selection.clearSelection();
```

### 3. Integração Completa em Componente React

```typescript
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  loadFichasData, 
  createFichasHeatmap,
  createFichasSelection,
  generateSummary,
  type FichasSummaryData 
} from '@/map/fichas';

function FichasMapComponent() {
  const mapRef = useRef<L.Map | null>(null);
  const heatmapRef = useRef(null);
  const selectionRef = useRef(null);
  const [summary, setSummary] = useState<FichasSummaryData | null>(null);

  useEffect(() => {
    // Inicializar mapa
    const map = L.map('map').setView([-23.5505, -46.6333], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    mapRef.current = map;

    // Carregar dados e criar heatmap
    loadFichasData().then(({ fichas }) => {
      const heatmap = createFichasHeatmap(map);
      heatmap.updateData(fichas);
      heatmapRef.current = heatmap;

      // Criar ferramenta de seleção
      const selection = createFichasSelection(map, fichas, (result) => {
        heatmap.updateData(result.fichas);
        const newSummary = generateSummary(result.fichas);
        setSummary(newSummary);
      });
      selectionRef.current = selection;
    });

    return () => {
      heatmapRef.current?.destroy();
      selectionRef.current?.destroy();
      map.remove();
    };
  }, []);

  return (
    <div>
      <div id="map" style={{ height: '600px' }} />
      <button onClick={() => selectionRef.current?.startRectangleSelection()}>
        Selecionar por Retângulo
      </button>
      <button onClick={() => selectionRef.current?.startPolygonSelection()}>
        Selecionar por Polígono
      </button>
      {summary && (
        <div>
          <h3>Resumo da Seleção</h3>
          <p>Total: {summary.total} fichas</p>
          {/* Exibir mais detalhes do resumo */}
        </div>
      )}
    </div>
  );
}
```

## Checklist de Testes Manuais

### ✅ Testes de Heatmap
- [ ] Heatmap carrega com dados do Google Sheets
- [ ] Cores do gradiente (verde → amarelo → vermelho) aparecem corretamente
- [ ] Heatmap permanece visível em todos os níveis de zoom (zoom in/out)
- [ ] `fitBounds()` centraliza o mapa corretamente
- [ ] Heatmap atualiza quando dados mudam
- [ ] Heatmap limpa corretamente com `clear()`

### ✅ Testes de Seleção por Retângulo
- [ ] Modo de seleção inicia com cursor crosshair
- [ ] Retângulo desenha enquanto arrasta o mouse
- [ ] Retângulo finaliza ao soltar o botão do mouse
- [ ] Fichas dentro do retângulo são filtradas corretamente
- [ ] Callback `onSelectionComplete` é chamado com dados corretos
- [ ] `clearSelection()` remove o retângulo do mapa

### ✅ Testes de Seleção por Polígono
- [ ] Modo de seleção inicia com cursor crosshair
- [ ] Vértices são adicionados a cada clique
- [ ] Polígono atualiza visualmente a cada vértice
- [ ] Duplo clique finaliza o polígono (mínimo 3 vértices)
- [ ] Fichas dentro do polígono são filtradas corretamente (Turf.js)
- [ ] `clearSelection()` remove o polígono do mapa

### ✅ Testes de Resumo
- [ ] `generateSummary()` calcula totais corretamente
- [ ] Agrupamento por projeto funciona
- [ ] Agrupamento por scouter funciona
- [ ] Percentuais são calculados corretamente
- [ ] Top projeto e top scouter são identificados
- [ ] `formatSummaryText()` gera texto legível
- [ ] `generateSummaryHTML()` gera HTML válido

### ✅ Testes de Integração
- [ ] Seleção → Heatmap atualiza com fichas selecionadas
- [ ] Seleção → Resumo atualiza com estatísticas
- [ ] Múltiplas seleções consecutivas funcionam
- [ ] Cancelar seleção limpa estado corretamente
- [ ] Destruir instâncias remove todos os listeners

## Fonte de Dados

### ⚠️ FONTE ÚNICA DE VERDADE: Tabela 'fichas' do Supabase

Os dados são carregados da tabela `fichas` do Supabase, que é a fonte centralizada da aplicação.

**Repository utilizado:**
```typescript
import { fetchFichasFromDB } from '@/repositories/fichasRepo';
// ou
import { getLeads } from '@/repositories/leadsRepo';
```

**Hook React:**
```typescript
import { useFichas } from '@/hooks/useFichas';

function MapComponent() {
  const { data: fichas, isLoading } = useFichas({ withGeo: true });
  // fichas agora contém apenas dados com latitude/longitude
}
```

**Consulta direta:**
```typescript
import { supabase } from '@/lib/supabase-helper';

const { data: fichas } = await supabase
  .from('fichas')
  .select('*')
  .not('latitude', 'is', null)
  .not('longitude', 'is', null)
  .eq('deleted', false);
```

### Estrutura de Dados Esperada

```typescript
interface FichaDataPoint {
  lat?: number;          // ou latitude
  lng?: number;          // ou longitude
  localizacao?: string;  // formato: "lat,lng" (backup)
  id?: string;
  projeto?: string;
  scouter?: string;
  data?: string;
  criado?: string;
}
```

### ❌ NÃO USE (Descontinuado)

- ~~Google Sheets direto via CSV~~ - Causa problemas de CORS
- ~~Tabela 'leads'~~ - Tabela legada
- ~~MockDataService~~ - Apenas para testes locais

Para mais informações sobre a fonte de dados, consulte: `/LEADS_DATA_SOURCE.md`

## Dependências

### Instaladas
- ✅ `leaflet` (^1.9.4) - Biblioteca de mapas
- ✅ `leaflet.heat` (^0.2.0) - Plugin para heatmap
- ✅ `@turf/turf` (^7.2.0) - Análise espacial

### Tipos TypeScript
- ✅ `@types/leaflet` (^1.9.20)

## Troubleshooting

### Heatmap não aparece
1. Verificar se há fichas com coordenadas válidas
2. Checar console para erros de parsing
3. Verificar se `maxZoom` não está muito baixo
4. Confirmar que dados foram carregados: `heatmap.getDataCount()`

### Seleção não funciona
1. Verificar se event listeners foram anexados
2. Checar se há fichas carregadas
3. Confirmar que Turf.js está instalado
4. Verificar console para erros de geometria

### Dados não carregam
1. Verificar conexão com Google Sheets
2. Checar formato da coluna "Localização"
3. Verificar parse de coordenadas no console
4. Testar com mock data

## Performance

### Otimizações Implementadas
- ✅ Heatmap renderiza eficientemente até 10.000+ pontos
- ✅ Filtro espacial usa Turf.js (otimizado para geometrias)
- ✅ Agrupamentos usam Map() para performance O(n)
- ✅ Destruição adequada previne memory leaks

### Recomendações
- Para datasets > 50.000 pontos: considere clustering adicional
- Para seleções complexas: use debounce no callback
- Para resumos frequentes: considere memoization

## Suporte e Contribuição

Para dúvidas ou melhorias, consulte:
- Documentação do Leaflet: https://leafletjs.com
- Documentação do Turf.js: https://turfjs.org
- Exemplos práticos nos testes manuais acima

---

**Versão**: 1.0.0  
**Última atualização**: 2024  
**Autor**: Sistema de Gestão Scouter

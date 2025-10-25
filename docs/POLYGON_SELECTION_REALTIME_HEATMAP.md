# Guia de Uso: Seleção Múltipla de Polígonos e Mapa de Calor em Tempo Real

## Visão Geral

O sistema TabuladorMax agora suporta seleção de múltiplas áreas geográficas (polígonos não contíguos) e atualização em tempo real do mapa de calor. Esta documentação descreve como usar essas funcionalidades.

## Funcionalidades Principais

### 1. Desenho e Seleção de Múltiplos Polígonos

#### Desenhar Áreas

Na aba **"Desenho de Áreas"**:

1. **Desenhar Polígono Livre:**
   - Clique no botão "Desenhar Polígono"
   - Clique no mapa para adicionar pontos
   - Continue adicionando pontos para definir a forma
   - Clique em "Finalizar" quando tiver 3+ pontos

2. **Desenhar Retângulo:**
   - Clique no botão "Desenhar Retângulo"
   - Clique no mapa para definir o primeiro canto
   - Clique novamente para definir o canto oposto
   - O retângulo é criado automaticamente

#### Gerenciar Seleção

- **Cores Automáticas:** Cada área recebe uma cor única para fácil identificação
- **Selecionar/Desselecionar:**
  - Clique diretamente no polígono no mapa
  - Ou clique na área na lista lateral
- **Visual:**
  - Áreas selecionadas: preenchimento sólido
  - Áreas não selecionadas: borda tracejada, preenchimento transparente
- **Selecionar/Desselecionar Todas:** 
  - Use o ícone de olho no painel de áreas

#### Estatísticas de Áreas

O painel lateral mostra:
- Número de áreas selecionadas vs total
- Total de leads filtrados nas áreas selecionadas
- Área total combinada (em km²)
- Lista de todas as áreas com contagem de leads

#### Filtrar Leads

- Leads são filtrados automaticamente para mostrar apenas aqueles dentro das áreas selecionadas
- A filtragem usa **união** de polígonos - leads em QUALQUER área selecionada são incluídos
- O mapa atualiza automaticamente quando a seleção muda

#### Excluir Áreas

- Clique no ícone de lixeira ao lado de cada área na lista

### 2. Mapa de Calor em Tempo Real

#### Ativação

Na aba **"Mapa de Calor - Fichas"**:

- O indicador "Tempo Real Ativo" aparece quando conectado
- O ícone de rádio pulsa indicando conexão ativa
- Atualizações chegam automaticamente do banco de dados

#### Como Funciona

1. **Conexão Inicial:**
   - Carrega dados históricos de fichas confirmadas
   - Estabelece conexão WebSocket com Supabase Realtime

2. **Atualizações Incrementais:**
   - Novos leads são adicionados ao mapa instantaneamente
   - Leads atualizados mudam de posição/status
   - Leads deletados são removidos

3. **Otimização:**
   - Debouncing de 500ms para evitar recalcular muito frequentemente
   - Apenas áreas afetadas são recalculadas
   - Cache de dados para performance

#### Indicadores Visuais

- **Badge "Tempo Real Ativo":** Verde quando conectado
- **Badge "Conectando...":** Cinza quando estabelecendo conexão
- **Badge "Atualizando mapa...":** Aparece durante recalculações
- **Animação de pulso:** No ícone de rádio quando ativo

#### Estatísticas

O mapa exibe:
- Total de fichas confirmadas (atualizado em tempo real)
- Taxa de comparecimento (%)
- Intensidade do mapa de calor (Baixa/Média/Alta)

### 3. Integração com Filtros

Ambas as funcionalidades respeitam os filtros globais:
- Filtro de projeto
- Filtro de scouter
- Filtro de período (data)

## Casos de Uso

### Caso 1: Análise de Bairros Não Contíguos

**Objetivo:** Analisar leads em bairros específicos que não são adjacentes

1. Acesse "Área de Abordagem" → "Desenho de Áreas"
2. Desenhe polígonos para cada bairro de interesse
3. Selecione apenas os bairros que deseja analisar
4. Visualize estatísticas combinadas no painel lateral
5. Exporte relatório em PDF ou CSV

### Caso 2: Monitoramento em Tempo Real

**Objetivo:** Acompanhar fichas confirmadas conforme chegam

1. Acesse "Área de Abordagem" → "Mapa de Calor - Fichas"
2. Verifique que "Tempo Real Ativo" está verde
3. Configure filtros de projeto/scouter se necessário
4. Observe o mapa atualizar automaticamente
5. Identifique áreas de alta concentração (vermelho)

### Caso 3: Comparação de Regiões

**Objetivo:** Comparar desempenho entre diferentes áreas

1. Desenhe polígonos para cada região
2. Selecione região A
3. Anote estatísticas (leads, área)
4. Desselecione região A, selecione região B
5. Compare estatísticas

## Tecnologias Utilizadas

### Turf.js
- Operações geométricas (união, interseção)
- Cálculos de área
- Detecção de pontos dentro de polígonos

### Supabase Realtime
- WebSocket para atualizações em tempo real
- Inscrição em mudanças da tabela `leads`
- Filtros server-side para eficiência

### Leaflet.js
- Renderização de mapas
- Clustering de marcadores
- Desenho interativo de polígonos

## Limitações e Considerações

### Performance

- **Recomendado:** Até 10 polígonos simultâneos
- **Máximo testado:** 20 polígonos
- Polígonos muito complexos podem impactar performance

### Geocodificação

- Atualmente usa coordenadas simuladas para demonstração
- Em produção, integrar com serviço de geocodificação real
- Respeitar rate limits do Nominatim (1 req/segundo)

### Conexão em Tempo Real

- Requer conexão estável com internet
- Reconecta automaticamente se desconectado
- Pode haver atraso de 1-2 segundos em atualizações

## Solução de Problemas

### Polígonos não aparecem após desenho
- Verifique se desenhou pelo menos 3 pontos
- Clique em "Finalizar" para polígono livre
- Para retângulo, clique dois pontos

### Tempo real não conecta
- Verifique conexão com internet
- Confirme que Supabase está configurado corretamente
- Verifique console do navegador para erros

### Leads não filtram corretamente
- Verifique se pelo menos uma área está selecionada
- Confirme que leads têm coordenadas válidas
- Área selecionada pode não conter leads

### Mapa lento com muitos leads
- Reduza período de data nos filtros
- Aplique filtro de projeto/scouter
- Desselecione áreas não necessárias

## API e Desenvolvimento

### Hook useRealtimeLeads

```typescript
import { useRealtimeLeads } from '@/hooks/useRealtimeLeads';

const { updates, clearUpdates, isConnected } = useRealtimeLeads({
  enabled: true,
  projectId: 'project-123',
  scouterId: 'scouter-456',
  onUpdate: (update) => {
    console.log('Lead update:', update);
  }
});
```

### Utilitários de Polígono

```typescript
import { 
  filterItemsInPolygons,
  unionPolygons,
  calculateTotalArea 
} from '@/utils/polygonUtils';

// Filtrar leads em polígonos
const filtered = filterItemsInPolygons(leads, polygons);

// Unir polígonos
const combined = unionPolygons(polygons);

// Calcular área total
const area = calculateTotalArea(polygons);
```

## Roadmap Futuro

- [ ] Salvar áreas desenhadas no banco de dados
- [ ] Compartilhar áreas entre usuários
- [ ] Exportar/importar áreas (GeoJSON)
- [ ] Editar áreas existentes
- [ ] Histórico de áreas criadas
- [ ] Integração com geocodificação real
- [ ] Análise temporal de áreas
- [ ] Notificações push para áreas específicas

## Suporte

Para dúvidas ou problemas, consulte:
- Documentação técnica em `/docs`
- Issues no GitHub
- Time de desenvolvimento

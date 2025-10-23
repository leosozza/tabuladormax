# Dashboard Avançado - Guia do Usuário

## Visão Geral

O Dashboard Avançado é um sistema profissional de criação de painéis personalizados que supera ferramentas como Looker Studio e PowerBI. Com ele, você pode:

- ✅ Criar dashboards totalmente personalizáveis
- ✅ Arrastar e redimensionar widgets livremente
- ✅ Escolher entre 14 tipos diferentes de gráficos
- ✅ Personalizar cores, legendas e aparência
- ✅ Criar fórmulas personalizadas para métricas customizadas
- ✅ Salvar, exportar e importar configurações
- ✅ Alternar entre modo de edição e visualização

## Tipos de Gráficos Disponíveis

### 1. **Tabela**
Visualização em formato de tabela com colunas personalizáveis.
- Melhor uso: Listar dados detalhados
- Suporta múltiplas métricas

### 2. **Gráfico de Barras**
Gráfico de barras verticais ou horizontais.
- Melhor uso: Comparar valores entre categorias
- Suporta múltiplas séries de dados

### 3. **Gráfico de Linhas**
Visualização de tendências ao longo do tempo.
- Melhor uso: Mostrar evolução temporal
- Ideal para dados de série temporal

### 4. **Gráfico de Área**
Similar ao gráfico de linhas, mas com área preenchida.
- Melhor uso: Destacar volume acumulado
- Bom para mostrar contribuições

### 5. **Gráfico de Pizza**
Gráfico circular mostrando proporções.
- Melhor uso: Mostrar distribuição percentual
- Limite: apenas 1 métrica

### 6. **Gráfico de Rosca (Donut)**
Variação do gráfico de pizza com centro vazio.
- Melhor uso: Similar ao gráfico de pizza
- Visual mais moderno

### 7. **Gráfico de Radar**
Visualização multi-dimensional em formato de radar.
- Melhor uso: Comparar múltiplas dimensões
- Ótimo para análise de competências

### 8. **Gráfico de Funil**
Visualização de conversão em etapas sequenciais.
- Melhor uso: Análise de pipeline de vendas
- Mostra taxas de conversão entre etapas

### 9. **Indicador Gauge (Velocímetro)**
Indicador circular de progresso.
- Melhor uso: KPIs com meta
- Visual impactante para uma única métrica

### 10. **Mapa de Calor (Heatmap)**
Matriz de intensidade de valores.
- Melhor uso: Identificar padrões em dados bidimensionais
- Ótimo para correlações

### 11. **Tabela Dinâmica (Pivot)**
Tabela com agregação cruzada de dados.
- Melhor uso: Análise multidimensional
- Mostra totais por linha e coluna

### 12. **Gráfico de Dispersão (Scatter)**
Pontos em plano cartesiano.
- Melhor uso: Identificar correlações
- Análise de relação entre variáveis

### 13. **Treemap**
Retângulos hierárquicos proporcionais.
- Melhor uso: Visualizar hierarquias e proporções
- Bom para grandes conjuntos de dados

### 14. **Card KPI**
Card simples com valor destacado.
- Melhor uso: Métricas principais
- Visual clean para dashboards executivos

## Como Criar um Widget

1. **Clique em "Adicionar Widget"**
2. **Aba "Configuração Básica":**
   - Defina o título e subtítulo
   - Escolha a dimensão (como agrupar dados)
   - Selecione as métricas a exibir
   - Escolha o tipo de visualização
   
3. **Aba "Aparência":**
   - Selecione o esquema de cores
   - Configure legenda (mostrar/ocultar, posição)
   - Configure grade e rótulos
   
4. **Aba "Avançado":**
   - Limite o número de resultados (ex: top 10)
   - Configure opções específicas do gráfico

## Drag & Drop (Arrastar e Soltar)

### Modo Edição
- **Mover widget**: Clique e arraste pelo título
- **Redimensionar**: Arraste pelos cantos inferiores direitos
- **Duplicar**: Clique no ícone de cópia
- **Excluir**: Clique no ícone de lixeira

### Modo Visualização
- Desabilita edição para apresentação
- Widgets não podem ser movidos ou redimensionados
- Melhor para compartilhar com stakeholders

## Esquemas de Cores

Escolha entre 7 paletas predefinidas:

1. **Padrão**: Cores vibrantes e balanceadas
2. **Azuis**: Tons de azul profissional
3. **Verdes**: Tons de verde naturais
4. **Quentes**: Amarelos, laranjas e vermelhos
5. **Frias**: Azuis e roxos
6. **Vibrante**: Cores intensas e chamativas
7. **Profissional**: Tons neutros e elegantes

## Gerenciamento de Dashboards

### Salvar Dashboard
1. Clique em "Opções" → "Salvar Dashboard"
2. Dê um nome e descrição
3. O dashboard será salvo no Supabase

### Carregar Dashboard
1. Use o dropdown no topo da página
2. Selecione o dashboard desejado
3. Os widgets serão carregados automaticamente

### Exportar Dashboard
1. Clique em "Opções" → "Exportar Configuração"
2. Um arquivo JSON será baixado
3. Guarde o arquivo para backup ou compartilhamento

### Importar Dashboard
1. Clique em "Opções" → "Importar Configuração"
2. Selecione o arquivo JSON
3. O dashboard será carregado

## Fórmulas Personalizadas (Futuro)

### Funções Disponíveis:
- `SUM(campo)` - Soma valores
- `AVG(campo)` - Calcula média
- `COUNT(*)` - Conta registros
- `COUNT_DISTINCT(campo)` - Conta valores únicos
- `PERCENT(num, den)` - Calcula percentual
- `DIVIDE(a, b)` - Divide valores
- `MIN(campo)`, `MAX(campo)` - Mínimo e máximo

### Exemplos:
```
Taxa de Conversão:
PERCENT(COUNT_DISTINCT(id_convertido), COUNT_DISTINCT(id))

Ticket Médio:
DIVIDE(SUM(valor_ficha), COUNT(*))

ROI Percentual:
PERCENT(SUBTRACT(SUM(receita), SUM(custo)), SUM(custo))
```

## Dicas de Performance

1. **Limite resultados**: Use o campo "Limitar resultados" para grandes datasets
2. **Escolha o tipo certo**: Tabelas dinâmicas são mais pesadas que KPIs
3. **Evite muitos widgets**: Mantenha dashboards focados (8-12 widgets)
4. **Use cache**: Dados são atualizados a cada 1 minuto automaticamente

## Dicas de Design

1. **Organize por importância**: Coloque KPIs principais no topo
2. **Use espaço em branco**: Não sobrecarregue o dashboard
3. **Consistência de cores**: Use o mesmo esquema para todo o dashboard
4. **Agrupe por tema**: Coloque widgets relacionados próximos
5. **Títulos claros**: Use títulos descritivos e objetivos

## Atalhos de Teclado (Futuro)

- `Ctrl + S`: Salvar dashboard
- `Ctrl + E`: Alternar modo edição
- `Ctrl + Z`: Desfazer última ação
- `Ctrl + Y`: Refazer ação
- `Del`: Excluir widget selecionado

## Solução de Problemas

### Dashboard não carrega
- Verifique conexão com internet
- Limpe cache do navegador
- Recarregue a página

### Widgets vazios
- Verifique filtros aplicados
- Confirme que há dados no período selecionado
- Verifique configuração de métricas

### Erro ao salvar
- Verifique se está autenticado
- Confirme permissões no Supabase
- Tente exportar como backup

## Suporte

Para dúvidas ou problemas:
- Consulte este guia
- Verifique exemplos nos templates rápidos
- Entre em contato com o administrador do sistema

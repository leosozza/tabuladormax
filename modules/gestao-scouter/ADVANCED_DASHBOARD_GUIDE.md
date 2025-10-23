# Advanced Dashboard System - Guia Completo

## Visão Geral

O Advanced Dashboard System é uma solução profissional de Business Intelligence que permite aos usuários criar dashboards personalizados e interativos com funcionalidades que superam ferramentas como Looker Studio e PowerBI.

## Características Principais

### 🎯 14 Tipos de Gráficos

O sistema suporta 14 tipos diferentes de visualizações:

1. **Tabela (Table)** - Visualização tabular completa com ordenação
2. **Gráfico de Barras (Bar Chart)** - Comparação de valores entre categorias
3. **Gráfico de Linhas (Line Chart)** - Tendências ao longo do tempo
4. **Gráfico de Área (Area Chart)** - Visualização de volume e tendência
5. **Gráfico de Pizza (Pie Chart)** - Distribuição percentual
6. **Gráfico de Rosca (Donut Chart)** - Distribuição com espaço central
7. **Card KPI** - Destaque de métricas importantes
8. **Gráfico de Radar (Radar Chart)** - Comparação multidimensional
9. **Gráfico de Funil (Funnel Chart)** - Visualização de etapas e conversão
10. **Indicador de Progresso (Gauge Chart)** - Progresso em relação a meta
11. **Mapa de Calor (Heatmap)** - Intensidade de valores em matriz
12. **Tabela Dinâmica (Pivot Table)** - Análise cruzada de dados
13. **Gráfico de Dispersão (Scatter Chart)** - Correlação entre duas variáveis
14. **Treemap** - Hierarquia de dados com retângulos proporcionais

### 🎨 Drag & Drop

- **Layout Flexível**: Grid de 12 colunas totalmente personalizável
- **Redimensionamento**: Ajuste tamanho dos widgets arrastando pelos cantos
- **Reposicionamento**: Arraste widgets para qualquer posição no dashboard
- **Auto-organização**: Compactação automática dos widgets
- **Responsivo**: Adapta-se a diferentes tamanhos de tela

### 🧮 Fórmulas Customizadas

Sistema poderoso de fórmulas para criar métricas personalizadas:

#### Funções Disponíveis

- **SUM(campo)** - Soma todos os valores
- **AVG(campo)** - Calcula média
- **MIN(campo)** - Valor mínimo
- **MAX(campo)** - Valor máximo
- **COUNT(*)** - Conta registros
- **COUNT_DISTINCT(campo)** - Conta valores únicos
- **PERCENT(num, den)** - Calcula percentual
- **DIVIDE(a, b)** - Divisão segura
- **MULTIPLY(a, b)** - Multiplicação
- **ADD(a, b)** - Adição
- **SUBTRACT(a, b)** - Subtração

#### Exemplos de Fórmulas

```
Taxa de Conversão: PERCENT(COUNT_DISTINCT(id_convertido), COUNT_DISTINCT(id))
Ticket Médio: DIVIDE(SUM(valor_ficha), COUNT(*))
ROI: PERCENT(SUBTRACT(SUM(receita), SUM(custo)), SUM(custo))
Crescimento: PERCENT(SUBTRACT(COUNT(*), COUNT_mes_anterior), COUNT_mes_anterior)
```

### 🎭 Personalização Visual

Cada widget pode ser personalizado com:

- **Esquemas de Cores**: 7 paletas predefinidas (Padrão, Azuis, Verdes, Quentes, Frias, Vibrante, Profissional)
- **Legenda**: Posicionamento (topo, rodapé, esquerda, direita) e visibilidade
- **Grade**: Mostrar/ocultar linhas de grade
- **Rótulos**: Controlar exibição de valores nos gráficos
- **Título e Subtítulo**: Personalização de textos

## Como Usar

### 1. Acessar o Dashboard Builder

Navegue para `/dashboard-advanced` na aplicação.

### 2. Criar um Novo Dashboard

1. Clique no menu **"Opções"** > **"Novo Dashboard"**
2. O sistema limpa todos os widgets e prepara um dashboard em branco

### 3. Adicionar Widgets

1. Clique no botão **"Adicionar Widget"**
2. Configure o widget em 4 abas:

#### Aba: Configuração Básica

- **Título do Painel**: Nome descritivo do widget
- **Subtítulo**: Informação adicional (opcional)
- **Agrupar por**: Selecione a dimensão (Scouter, Projeto, Data, etc.)
- **Agrupamento de Data**: Se selecionou "Data", escolha o período (Dia, Semana, Mês, Trimestre, Ano)
- **Métricas**: Selecione uma ou mais métricas para visualizar
- **Tipo de Visualização**: Escolha entre os 14 tipos de gráficos

#### Aba: Aparência

- **Esquema de Cores**: Selecione a paleta visual
- **Mostrar Legenda**: Ativar/desativar e posicionar
- **Mostrar Grade**: Para gráficos de linha, barra, área
- **Mostrar Rótulos**: Exibir valores nos gráficos

#### Aba: Fórmula

- **Criar Fórmula**: Clique para abrir o Formula Builder
- **Editar/Remover**: Gerencie fórmulas existentes
- **Validação**: O sistema valida a sintaxe em tempo real

#### Aba: Avançado

- **Limitar Resultados**: Defina um número máximo de registros (ex: Top 10)
- **Dicas**: Orientações sobre uso específico de cada tipo de gráfico

### 4. Organizar Layout

No **Modo Edição**:

- **Arrastar**: Clique e arraste widgets para reposicionar
- **Redimensionar**: Arraste pelos cantos para ajustar tamanho
- **Duplicar**: Clique no ícone de cópia no canto superior direito
- **Excluir**: Clique no ícone de lixeira no canto superior direito

### 5. Salvar Dashboard

1. Clique em **"Opções"** > **"Salvar Dashboard"**
2. Digite um nome e descrição
3. O dashboard é salvo no banco de dados

### 6. Carregar Dashboard Salvo

Use o dropdown no topo da página para selecionar e carregar dashboards salvos anteriormente.

### 7. Exportar/Importar

- **Exportar**: Menu "Opções" > "Exportar Configuração" - Gera arquivo JSON
- **Importar**: Menu "Opções" > "Importar Configuração" - Carrega arquivo JSON

### 8. Modo Visualização

Desative o **Modo Edição** via menu "Opções" para:
- Desabilitar drag & drop
- Ocultar botões de edição/exclusão
- Visualização limpa para apresentações

## Métricas Disponíveis

O sistema oferece 11 métricas predefinidas:

- **Quantidade de Fichas**: COUNT_DISTINCT(id)
- **Total de Registros**: COUNT(*)
- **Valor Total**: SUM(valor_ficha)
- **Valor Médio**: AVG(valor_ficha)
- **Fichas com Foto**: COUNT de registros com foto
- **Fichas Confirmadas**: COUNT de confirmadas
- **Fichas Agendadas**: COUNT de agendadas
- **Comparecimentos**: COUNT de compareceu = 1
- **% com Foto**: Percentual de fichas com foto
- **% Confirmadas**: Percentual de confirmadas
- **% Comparecimento**: Percentual de comparecimento

## Dimensões para Agrupamento

Organize seus dados por:

- **Scouter**: Desempenho individual
- **Projeto**: Análise por projeto
- **Data**: Tendências temporais
- **Supervisor**: Gestão de equipes
- **Localização**: Análise geográfica
- **Etapa**: Funil de conversão
- **Tabulação**: Classificação customizada
- **Status de Confirmação**: Estado das fichas

## Dicas de Uso

### Para Gráficos de Funil
- Use métricas que representem etapas sequenciais
- Ordene os dados de forma lógica (topo do funil → base)

### Para Gauge (Indicador)
- Use métricas de progresso ou percentuais
- Configure valores mínimo e máximo adequados

### Para Scatter (Dispersão)
- Selecione exatamente 2 métricas
- Use para identificar correlações

### Para Heatmap
- Ideal para visualizar densidade e padrões
- Use dimensões com múltiplas categorias

### Para Treemap
- Excelente para hierarquias e proporções
- Cores representam diferentes categorias

## Casos de Uso

### 1. Dashboard de Performance de Scouters
- KPI Cards: Total de Fichas, Valor Total
- Bar Chart: Fichas por Scouter
- Line Chart: Evolução diária
- Funnel Chart: Etapas do processo

### 2. Dashboard Financeiro
- Gauge: Meta de Faturamento
- Area Chart: Receita ao longo do tempo
- Pie Chart: Distribuição por projeto
- Table: Detalhamento de valores

### 3. Dashboard Operacional
- Heatmap: Atividade por hora/dia
- Radar: Comparação multidimensional de scouters
- Scatter: Correlação entre atividade e resultado
- Pivot Table: Análise cruzada projeto x scouter

## Arquitetura Técnica

### Componentes Principais

- **AdvancedDashboard.tsx**: Página principal com layout de grid
- **DynamicWidget.tsx**: Renderiza widgets baseado em configuração
- **WidgetConfigModal.tsx**: Modal de configuração de widgets
- **FormulaBuilder.tsx**: Editor visual de fórmulas
- **Charts/**: 14 componentes de gráficos individuais

### Tecnologias

- **React Grid Layout**: Sistema de drag & drop
- **ApexCharts**: Biblioteca de gráficos
- **React Query**: Cache e sincronização de dados
- **Supabase**: Persistência de configurações
- **Zod**: Validação de schemas

### Persistência

Dashboards são salvos no Supabase com estrutura:
```typescript
{
  id: string
  name: string
  description: string
  widgets: DashboardWidget[]
  layout: { cols, rowHeight, compactType }
  is_default: boolean
  created_at: timestamp
  updated_at: timestamp
}
```

## Limitações e Considerações

1. **Performance**: Dashboards com muitos widgets (>20) podem ter impacto na performance
2. **Refresh**: Dados são atualizados a cada 1 minuto automaticamente
3. **Mobile**: Melhor experiência em desktop, mobile tem limitações no drag & drop
4. **Fórmulas**: Validação básica, fórmulas complexas podem precisar testes
5. **Dados**: Depende da qualidade e completude dos dados no Supabase

## Roadmap Futuro

- [ ] Filtros globais de dashboard
- [ ] Drill-down em gráficos
- [ ] Agendamento de relatórios
- [ ] Compartilhamento de dashboards
- [ ] Temas customizados
- [ ] Mais tipos de gráficos (Sankey, Gantt, etc.)
- [ ] Alertas e notificações baseados em métricas
- [ ] Integração com BI externo

## Suporte

Para dúvidas ou problemas:
1. Verifique este guia primeiro
2. Teste com dados de exemplo
3. Revise os logs do console do navegador
4. Entre em contato com a equipe de desenvolvimento

---

**Versão**: 1.0.0  
**Última Atualização**: Outubro 2025

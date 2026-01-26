
# Dashboard Central de Atendimento WhatsApp

## Resumo

Criar uma pagina de dashboard completa em `/admin/whatsapp-dashboard` para monitoramento da Central de Atendimento WhatsApp, com metricas em tempo real, graficos de desempenho e indicadores de SLA.

---

## Dados Disponiveis (ja existentes no banco)

A materialized view `mv_whatsapp_conversation_stats` ja fornece:
- **total_conversations**: 32.840 conversas nos ultimos 90 dias
- **response_status**: 'waiting' (3.492), 'never' (1.071), 'replied' (28.277)
- **unread_count**: Total de mensagens nao lidas
- **last_customer_message_at**: Para calcular janela de 24h (1.087 abertas)
- **last_message_at**: Timestamp da ultima atividade

A tabela `whatsapp_messages` fornece:
- Volume de mensagens por dia/hora
- Distribuicao inbound/outbound
- Operadores (via sender_name)

A tabela `whatsapp_conversation_closures` fornece:
- Conversas encerradas (61 ativas)

---

## Estrutura do Dashboard

### 1. Cards de KPIs Principais (Linha 1)

| KPI | Valor Exemplo | Fonte |
|-----|---------------|-------|
| Janelas Abertas (24h) | 1.087 | last_customer_message_at > 24h |
| Aguardando Resposta | 3.492 | response_status = 'waiting' |
| Nunca Respondidas | 1.071 | response_status = 'never' |
| Conversas Encerradas | 61 | whatsapp_conversation_closures |
| Mensagens Nao Lidas | 29.730 | SUM(unread_count) |

### 2. Cards de Volume (Linha 2)

| KPI | Valor Exemplo |
|-----|---------------|
| Mensagens Hoje | Recebidas / Enviadas |
| Taxa de Resposta | % respondidas vs total |
| Tempo Medio de Resposta | (a calcular) |

### 3. Graficos

**Grafico 1: Volume de Mensagens (Ultimos 7 dias)**
- Linha mostrando recebidas vs enviadas por dia
- Dados: whatsapp_messages agregado por dia

**Grafico 2: Distribuicao por Hora do Dia**
- Barras mostrando volume de mensagens recebidas por hora
- Pico: 15h (1.203 mensagens), minimo: 3h (1 mensagem)

**Grafico 3: Status das Conversas (Pizza/Donut)**
- Respondidas: 28.277
- Aguardando: 3.492
- Nunca respondidas: 1.071

**Grafico 4: Top Operadores (Barras Horizontais)**
- Ranking de atendentes por volume de mensagens enviadas
- Excluir automacoes (Flow, Bitrix)

### 4. Tabela de Conversas Pendentes

Lista das conversas com status 'waiting' ordenadas por tempo de espera.

---

## Arquivos a Criar

```text
src/pages/admin/WhatsAppDashboard.tsx           # Pagina principal
src/hooks/useWhatsAppDashboardStats.ts          # Hook para buscar dados
src/components/whatsapp-dashboard/
  ├── WhatsAppKPICards.tsx                      # Cards de KPI
  ├── WhatsAppVolumeChart.tsx                   # Grafico de volume
  ├── WhatsAppHourlyChart.tsx                   # Grafico por hora
  ├── WhatsAppStatusChart.tsx                   # Grafico de status
  ├── WhatsAppOperatorRanking.tsx               # Ranking de operadores
  └── WhatsAppPendingTable.tsx                  # Tabela de pendentes
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/App.tsx` | Adicionar rota `/admin/whatsapp-dashboard` |

---

## Implementacao Detalhada

### 1. Hook `useWhatsAppDashboardStats`

```typescript
export function useWhatsAppDashboardStats() {
  // Query 1: KPIs principais (usa MV existente)
  const kpis = useQuery({
    queryKey: ['whatsapp-dashboard-kpis'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_admin_whatsapp_stats');
      return data[0];
    }
  });

  // Query 2: Contagem por status
  const statusCounts = useQuery({
    queryKey: ['whatsapp-dashboard-status'],
    queryFn: async () => {
      // Agregar mv_whatsapp_conversation_stats por response_status
    }
  });

  // Query 3: Volume diario (7 dias)
  const dailyVolume = useQuery({
    queryKey: ['whatsapp-dashboard-daily'],
    queryFn: async () => {
      // Agregar whatsapp_messages por dia
    }
  });

  // Query 4: Volume por hora
  const hourlyVolume = useQuery({
    queryKey: ['whatsapp-dashboard-hourly'],
    queryFn: async () => {
      // Agregar whatsapp_messages por hora
    }
  });

  // Query 5: Top operadores
  const topOperators = useQuery({
    queryKey: ['whatsapp-dashboard-operators'],
    queryFn: async () => {
      // Agregar whatsapp_messages por sender_name
    }
  });

  return { kpis, statusCounts, dailyVolume, hourlyVolume, topOperators };
}
```

### 2. Pagina Principal

```tsx
export default function WhatsAppDashboard() {
  return (
    <AdminPageLayout
      title="Dashboard Central de Atendimento"
      description="Metricas e indicadores do WhatsApp"
    >
      {/* Linha 1: KPIs Principais */}
      <WhatsAppKPICards />
      
      {/* Linha 2: Graficos lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WhatsAppVolumeChart />
        <WhatsAppStatusChart />
      </div>
      
      {/* Linha 3: Horario e Operadores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WhatsAppHourlyChart />
        <WhatsAppOperatorRanking />
      </div>
      
      {/* Linha 4: Tabela de Pendentes */}
      <WhatsAppPendingTable />
    </AdminPageLayout>
  );
}
```

### 3. Cards de KPI

```tsx
const kpis = [
  {
    title: 'Janelas Abertas',
    value: stats.openWindows,
    icon: MessageSquare,
    color: 'text-green-500',
    description: 'Ultimas 24h'
  },
  {
    title: 'Aguardando Resposta',
    value: stats.waiting,
    icon: Clock,
    color: 'text-amber-500',
    description: 'Cliente respondeu'
  },
  {
    title: 'Nunca Respondidas',
    value: stats.never,
    icon: AlertCircle,
    color: 'text-red-500',
    description: 'Sem resposta da equipe'
  },
  {
    title: 'Encerradas',
    value: stats.closed,
    icon: CheckCircle,
    color: 'text-blue-500',
    description: 'Atendimentos finalizados'
  },
  {
    title: 'Mensagens Nao Lidas',
    value: stats.unread,
    icon: Mail,
    color: 'text-purple-500',
    description: 'Total pendente'
  }
];
```

---

## RPC a Criar (Opcional - Otimizacao)

Para melhor performance, criar uma RPC dedicada:

```sql
CREATE OR REPLACE FUNCTION get_whatsapp_dashboard_stats()
RETURNS JSON AS $$
BEGIN
  RETURN json_build_object(
    'kpis', (
      SELECT json_build_object(
        'total', COUNT(*),
        'open_windows', COUNT(*) FILTER (WHERE last_customer_message_at > NOW() - INTERVAL '24 hours'),
        'waiting', COUNT(*) FILTER (WHERE response_status = 'waiting'),
        'never', COUNT(*) FILTER (WHERE response_status = 'never'),
        'replied', COUNT(*) FILTER (WHERE response_status = 'replied'),
        'unread', COALESCE(SUM(unread_count), 0)
      )
      FROM mv_whatsapp_conversation_stats
      WHERE last_message_at > NOW() - INTERVAL '90 days'
    ),
    'daily_volume', (
      SELECT json_agg(row_to_json(d))
      FROM (
        SELECT 
          DATE(created_at AT TIME ZONE 'America/Sao_Paulo') as date,
          COUNT(*) FILTER (WHERE direction = 'inbound') as received,
          COUNT(*) FILTER (WHERE direction = 'outbound') as sent
        FROM whatsapp_messages
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY 1
        ORDER BY 1
      ) d
    ),
    'hourly_distribution', (
      SELECT json_agg(row_to_json(h))
      FROM (
        SELECT 
          EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Sao_Paulo')::int as hour,
          COUNT(*) as count
        FROM whatsapp_messages
        WHERE created_at > NOW() - INTERVAL '7 days'
          AND direction = 'inbound'
        GROUP BY 1
        ORDER BY 1
      ) h
    ),
    'top_operators', (
      SELECT json_agg(row_to_json(o))
      FROM (
        SELECT sender_name as name, COUNT(*) as messages
        FROM whatsapp_messages
        WHERE created_at > NOW() - INTERVAL '7 days'
          AND direction = 'outbound'
          AND sender_name IS NOT NULL
          AND sender_name NOT LIKE '%Bitrix%'
          AND sender_name NOT LIKE '%Flow%'
          AND sender_name NOT LIKE '%Sistema%'
          AND sender_name NOT LIKE '%Automação%'
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 10
      ) o
    ),
    'closed_count', (
      SELECT COUNT(*) FROM whatsapp_conversation_closures WHERE reopened_at IS NULL
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Fluxo Visual

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Dashboard Central de Atendimento                           [Atualizar] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │ Janelas  │ │Aguardando│ │  Nunca   │ │Encerradas│ │ Nao Lidas│     │
│  │ Abertas  │ │ Resposta │ │Respondido│ │          │ │          │     │
│  │  1.087   │ │  3.492   │ │  1.071   │ │    61    │ │  29.730  │     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│                                                                         │
│  ┌────────────────────────────┐ ┌────────────────────────────┐        │
│  │ Volume de Mensagens        │ │ Status das Conversas       │        │
│  │        (Linha)             │ │        (Donut)             │        │
│  │  ~~~~/\~~~~~/\~~~          │ │      ████████              │        │
│  │ [Recebidas] [Enviadas]     │ │ Respondidas 86%            │        │
│  └────────────────────────────┘ └────────────────────────────┘        │
│                                                                         │
│  ┌────────────────────────────┐ ┌────────────────────────────┐        │
│  │ Mensagens por Hora         │ │ Top Atendentes             │        │
│  │     (Barras)               │ │   (Barras Horizontais)     │        │
│  │  ▄▄▄▄████████████▄▄       │ │ Ana Beatriz  ████████      │        │
│  │  00  06  12  18  24        │ │ Marcos      ██████         │        │
│  └────────────────────────────┘ └────────────────────────────┘        │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ Conversas Aguardando Resposta                                    │  │
│  ├───────────────────────────────────────────────────────────────── │  │
│  │ Nome        | Telefone      | Esperando | Acao                   │  │
│  │ Maria Silva | 11999999999   | 2h        | [Abrir Chat]          │  │
│  │ Joao Santos | 11888888888   | 1h30min   | [Abrir Chat]          │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tecnologias Utilizadas

- **React Query**: Cache e atualizacao automatica
- **ApexCharts**: Graficos (ja instalado no projeto)
- **Shadcn/UI**: Cards, Tabelas, Botoes
- **Supabase RPC**: Queries otimizadas no banco

---

## Resumo das Mudancas

1. **Nova Pagina**: `src/pages/admin/WhatsAppDashboard.tsx`
2. **Novo Hook**: `src/hooks/useWhatsAppDashboardStats.ts`
3. **Novos Componentes**: 6 componentes de dashboard
4. **Nova Rota**: `/admin/whatsapp-dashboard` em App.tsx
5. **Nova RPC** (opcional): `get_whatsapp_dashboard_stats()`

O dashboard usara dados ja existentes, sem necessidade de criar novas tabelas. A RPC e opcional mas recomendada para performance.

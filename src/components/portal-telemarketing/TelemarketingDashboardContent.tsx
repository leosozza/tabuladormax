import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, CheckCircle, Calendar, TrendingUp, Trophy, Loader2 } from 'lucide-react';
import { ApexBarChart } from '@/components/dashboard/charts/ApexBarChart';
import { ApexDonutChart } from '@/components/dashboard/charts/ApexDonutChart';
import { ApexLineChart } from '@/components/dashboard/charts/ApexLineChart';
import { useTelemarketingMetrics, PeriodFilter } from '@/hooks/useTelemarketingMetrics';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SUPERVISOR_CARGO } from './TelemarketingAccessKeyForm';

interface TelemarketingDashboardContentProps {
  operatorBitrixId?: number;
  operatorCargo?: string;
}

export function TelemarketingDashboardContent({ 
  operatorBitrixId, 
  operatorCargo 
}: TelemarketingDashboardContentProps) {
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const isSupervisor = operatorCargo === SUPERVISOR_CARGO;
  
  // Supervisors see all, agents see only their data
  const filterOperatorId = isSupervisor ? undefined : operatorBitrixId;
  
  const { data: metrics, isLoading, error } = useTelemarketingMetrics(period, filterOperatorId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando métricas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-destructive">Erro ao carregar métricas</p>
      </div>
    );
  }

  const kpis = [
    {
      title: 'Leads Trabalhados',
      value: metrics?.totalLeads || 0,
      icon: Phone,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Fichas Confirmadas',
      value: metrics?.fichasConfirmadas || 0,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Agendamentos',
      value: metrics?.agendamentos || 0,
      icon: Calendar,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      title: 'Taxa de Conversão',
      value: `${(metrics?.taxaConversao || 0).toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  // Prepare chart data
  const barChartCategories = metrics?.operatorPerformance.map(op => 
    op.name.split(' ')[0] || 'N/A'
  ) || [];
  
  const barChartSeries = [
    {
      name: 'Leads',
      data: metrics?.operatorPerformance.map(op => op.leads) || [],
    },
    {
      name: 'Confirmadas',
      data: metrics?.operatorPerformance.map(op => op.confirmadas) || [],
    },
  ];

  const donutLabels = metrics?.statusDistribution.map(s => s.status) || [];
  const donutSeries = metrics?.statusDistribution.map(s => s.count) || [];

  const lineCategories = metrics?.timeline.map(t => t.date) || [];
  const lineSeries = [
    {
      name: 'Leads',
      data: metrics?.timeline.map(t => t.leads) || [],
    },
    {
      name: 'Confirmadas',
      data: metrics?.timeline.map(t => t.confirmadas) || [],
    },
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {isSupervisor ? 'Dashboard da Equipe' : 'Meu Dashboard'}
        </h2>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mês</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Chart - Operator Performance (only for supervisors) */}
        {isSupervisor && barChartCategories.length > 0 && (
          <ApexBarChart
            title="Performance por Operador"
            categories={barChartCategories}
            series={barChartSeries}
            height={300}
          />
        )}

        {/* Donut Chart - Status Distribution */}
        {donutLabels.length > 0 && (
          <ApexDonutChart
            title="Distribuição de Status"
            labels={donutLabels}
            series={donutSeries}
            height={300}
          />
        )}
      </div>

      {/* Timeline Chart */}
      {lineCategories.length > 0 && (
        <ApexLineChart
          title={period === 'today' ? 'Atividade por Hora' : 'Atividade nos Últimos Dias'}
          categories={lineCategories}
          series={lineSeries}
          height={280}
        />
      )}

      {/* Ranking Table (only for supervisors) */}
      {isSupervisor && metrics?.operatorPerformance && metrics.operatorPerformance.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Ranking de Operadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Operador</TableHead>
                  <TableHead className="text-center">Leads</TableHead>
                  <TableHead className="text-center">Confirmadas</TableHead>
                  <TableHead className="text-center">Taxa</TableHead>
                  <TableHead className="text-center">Agendamentos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.operatorPerformance.map((op, index) => {
                  const taxa = op.leads > 0 ? ((op.confirmadas / op.leads) * 100).toFixed(1) : '0.0';
                  return (
                    <TableRow key={op.name}>
                      <TableCell>
                        {index === 0 && <Badge className="bg-yellow-500">🥇</Badge>}
                        {index === 1 && <Badge className="bg-gray-400">🥈</Badge>}
                        {index === 2 && <Badge className="bg-orange-600">🥉</Badge>}
                        {index > 2 && <span className="text-muted-foreground">{index + 1}</span>}
                      </TableCell>
                      <TableCell className="font-medium">{op.name}</TableCell>
                      <TableCell className="text-center">{op.leads}</TableCell>
                      <TableCell className="text-center text-green-600 font-medium">{op.confirmadas}</TableCell>
                      <TableCell className="text-center">{taxa}%</TableCell>
                      <TableCell className="text-center">{op.agendamentos}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {metrics?.totalLeads === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Nenhum dado encontrado para o período selecionado.
          </p>
        </Card>
      )}
    </div>
  );
}

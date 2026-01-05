import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Phone, Calendar as CalendarIcon, TrendingUp, Trophy, Loader2, Share2, FileDown, Link as LinkIcon, Users, CheckCircle, Bot, PartyPopper } from 'lucide-react';
import { ApexBarChart } from '@/components/dashboard/charts/ApexBarChart';
import { ApexHorizontalBarChart } from '@/components/dashboard/charts/ApexHorizontalBarChart';
import { ApexLineChart } from '@/components/dashboard/charts/ApexLineChart';
import { useTelemarketingMetrics, PeriodFilter } from '@/hooks/useTelemarketingMetrics';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SUPERVISOR_CARGO } from './TelemarketingAccessKeyForm';
import { LeadsDetailModal, KpiType } from './LeadsDetailModal';
import { ShareReportModal } from './ShareReportModal';
import { AgendamentosPorDataModal } from './AgendamentosPorDataModal';
import { ComparecimentosDetailModal } from './ComparecimentosDetailModal';
import { TelemarketingAIAnalysisModal } from './TelemarketingAIAnalysisModal';
import { useTelemarketingAIAnalysis } from '@/hooks/useTelemarketingAIAnalysis';
import { useComparecimentosRanking, ComparecimentosPeriod } from '@/hooks/useComparecimentosRanking';
import { useSupervisorTeam } from '@/hooks/useSupervisorTeam';
import { 
  generateTelemarketingReportPDF, 
  createShareableReport,
  TelemarketingReportData 
} from '@/services/telemarketingReportService';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface TelemarketingDashboardContentProps {
  operatorBitrixId?: number;
  operatorCargo?: string;
  commercialProjectId?: string;
}

export function TelemarketingDashboardContent({ 
  operatorBitrixId, 
  operatorCargo,
  commercialProjectId
}: TelemarketingDashboardContentProps) {
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [selectedOperator, setSelectedOperator] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<KpiType>('leads');
  const [modalTitle, setModalTitle] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareExpiresAt, setShareExpiresAt] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [agendamentosModalOpen, setAgendamentosModalOpen] = useState(false);
  const [comparecimentosModalOpen, setComparecimentosModalOpen] = useState(false);
  const [aiAnalysisOpen, setAiAnalysisOpen] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [comparecimentosPeriod, setComparecimentosPeriod] = useState<ComparecimentosPeriod>('today');
  
  const isSupervisor = operatorCargo === SUPERVISOR_CARGO;
  
  // Hook para buscar equipe do supervisor (apenas agentes sob supervisão direta)
  const { data: supervisorTeam } = useSupervisorTeam(
    commercialProjectId || null,
    operatorBitrixId || null
  );
  
  // AI Analysis hook
  const { 
    isLoading: isAnalysisLoading, 
    analysis, 
    error: analysisError, 
    generateAnalysis, 
    clearAnalysis 
  } = useTelemarketingAIAnalysis();
  
  // Supervisors can filter by specific operator or see all
  // Agents only see their own data
  const filterOperatorId = isSupervisor 
    ? (selectedOperator !== 'all' ? parseInt(selectedOperator) : undefined)
    : operatorBitrixId;
  
  const { data: metrics, isLoading, error } = useTelemarketingMetrics(
    period, 
    filterOperatorId,
    period === 'custom' ? customDateRange?.from : undefined,
    period === 'custom' ? customDateRange?.to : undefined
  );

  // Hook para ranking de comparecimentos (supervisores)
  const { ranking: comparecimentosRanking, isLoading: isComparecimentosLoading } = useComparecimentosRanking(
    operatorBitrixId || null,
    comparecimentosPeriod
  );

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case 'week':
        return { start: startOfWeek(now, { locale: ptBR }), end: endOfWeek(now, { locale: ptBR }) };
      case 'last7days':
        return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'custom':
        return { 
          start: customDateRange?.from || startOfDay(now), 
          end: customDateRange?.to || endOfDay(now) 
        };
      default:
        return { start: startOfDay(now), end: endOfDay(now) };
    }
  };

  const handleKpiClick = (type: KpiType, title: string, status?: string) => {
    setModalType(type);
    setModalTitle(title);
    setFilterStatus(status);
    setModalOpen(true);
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'today': return 'Hoje';
      case 'yesterday': return 'Ontem';
      case 'week': return 'Esta Semana';
      case 'last7days': return 'Últimos 7 dias';
      case 'month': return 'Este Mês';
      case 'custom': 
        if (customDateRange?.from && customDateRange?.to) {
          return `${format(customDateRange.from, 'dd/MM', { locale: ptBR })} - ${format(customDateRange.to, 'dd/MM', { locale: ptBR })}`;
        }
        return 'Intervalo';
      default: return 'Hoje';
    }
  };

  const prepareReportData = (): TelemarketingReportData => {
    const totalLeads = metrics?.totalLeads || 0;
    return {
      period,
      periodLabel: getPeriodLabel(),
      date: format(new Date(), "dd/MM/yyyy", { locale: ptBR }),
      totalLeads,
      agendamentos: metrics?.agendamentos || 0,
      comparecimentos: metrics?.comparecimentos?.total || 0,
      taxaConversao: metrics?.taxaConversao || 0,
      operatorPerformance: (metrics?.operatorPerformance || []).map(op => ({
        name: op.name,
        leads: op.leads,
        agendamentos: op.agendamentos,
        confirmadas: op.confirmadas,
        leadsScouter: op.leadsScouter,
        leadsMeta: op.leadsMeta,
      })),
      scouterPerformance: metrics?.scouterPerformance || [],
      tabulacaoDistribution: (metrics?.tabulacaoGroups || []).map(tab => ({
        label: tab.label,
        count: tab.count,
        percentage: totalLeads > 0 ? `${((tab.count / totalLeads) * 100).toFixed(1)}%` : '0%',
      })),
      timeline: (metrics?.timeline || []).map(t => ({
        date: t.date,
        leads: t.leads,
        agendados: t.agendados,
      })),
      statusDistribution: (metrics?.statusDistribution || []).map(s => ({
        status: s.status,
        count: s.count,
      })),
      createdBy: operatorBitrixId,
      agendamentosPorData: (metrics?.agendamentosPorData || []).map(a => ({
        data: a.data,
        dataFormatada: a.dataFormatada,
        total: a.total,
        leads: a.leads.map(l => ({
          id: l.id,
          name: l.name,
          scouter: l.scouter,
          telemarketing: l.telemarketing,
          fonte: l.fonte,
        })),
      })),
      comparecimentosDetail: (metrics?.comparecimentos?.leads || []).map(c => ({
        id: c.id,
        name: c.name,
        scouter: c.scouter,
        telemarketing: c.telemarketing,
        agendadoEm: c.agendadoEm,
        dataComparecimento: c.dataComparecimento,
        fonte: c.fonte,
      })),
    };
  };

  const handleExportPDF = () => {
    try {
      const reportData = prepareReportData();
      generateTelemarketingReportPDF(reportData);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  const handleGenerateLink = async () => {
    setIsExporting(true);
    try {
      const reportData = prepareReportData();
      const result = await createShareableReport(reportData);
      
      if (result.success && result.url) {
        setShareUrl(result.url);
        setShareExpiresAt(result.expiresAt || '');
        setShareModalOpen(true);
      } else {
        toast.error(result.error || 'Erro ao gerar link');
      }
    } catch (error) {
      console.error('Error generating link:', error);
      toast.error('Erro ao gerar link compartilhável');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenAIAnalysis = () => {
    if (!metrics) return;
    
    const { start, end } = getDateRange();
    setAiAnalysisOpen(true);
    
    generateAnalysis(
      period,
      getPeriodLabel(),
      {
        totalLeads: metrics.totalLeads,
        agendamentos: metrics.agendamentos,
        comparecimentos: metrics.comparecimentos?.total || 0,
        taxaConversao: metrics.taxaConversao,
        operatorPerformance: metrics.operatorPerformance.map(op => ({
          name: op.name,
          leads: op.leads,
          agendamentos: op.agendamentos,
          confirmadas: op.confirmadas,
          leadsScouter: op.leadsScouter,
          leadsMeta: op.leadsMeta,
        })),
        scouterPerformance: metrics.scouterPerformance.map(s => ({
          name: s.name,
          total: s.totalLeads,
          agendados: s.agendamentos,
          confirmados: Math.round(s.agendamentos * (s.taxaConversao / 100)),
        })),
        tabulacaoDistribution: (metrics.tabulacaoGroups || []).map(t => ({
          label: t.label,
          count: t.count,
        })),
      },
      start,
      end
    );
  };

  const handleCloseAIAnalysis = () => {
    setAiAnalysisOpen(false);
    clearAnalysis();
  };

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

  // Get available operators from metrics, filtered by supervisor's team
  const teamAgentBitrixIds = new Set(
    supervisorTeam?.agents.map(a => a.bitrix_telemarketing_id) || []
  );
  
  // Se supervisor tem equipe definida, filtra apenas os agentes da sua equipe
  const availableOperators = isSupervisor && teamAgentBitrixIds.size > 0
    ? (metrics?.availableOperators || []).filter(op => teamAgentBitrixIds.has(op.bitrix_id))
    : (metrics?.availableOperators || []);

  const kpis = [
    {
      title: 'Leads Trabalhados',
      value: metrics?.totalLeads || 0,
      icon: Phone,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      type: 'leads' as KpiType,
      onClick: () => handleKpiClick('leads', 'Leads Trabalhados'),
    },
    {
      title: 'Agendados',
      value: metrics?.agendamentos || 0,
      subtitle: metrics?.agendamentosPorData?.length ? 
        metrics.agendamentosPorData.slice(0, 2).map(a => `${a.total} p/ ${a.dataFormatada.slice(0, 5)}`).join(' | ') 
        : undefined,
      icon: CalendarIcon,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      type: null, // Custom handler
      onClick: () => {
        console.log('[Agendados] Card clicked, opening modal');
        setAgendamentosModalOpen(true);
      },
    },
    {
      title: 'Comparecidos',
      value: metrics?.comparecimentos?.total || 0,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      type: null, // Custom handler
      onClick: () => setComparecimentosModalOpen(true),
    },
    {
      title: 'Taxa de Conversão',
      value: `${(metrics?.taxaConversao || 0).toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      type: null, // Not clickable
      onClick: undefined,
    },
  ];

  // Prepare chart data
  const barChartCategories = metrics?.operatorPerformance.map(op => 
    op.name.split(' ')[0] || 'N/A'
  ) || [];
  
  const barChartSeries = [
    {
      name: 'Agendamentos',
      data: metrics?.operatorPerformance.map(op => op.agendamentos) || [],
    },
    {
      name: 'Leads',
      data: metrics?.operatorPerformance.map(op => op.leads) || [],
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
      name: 'Agendados',
      data: metrics?.timeline.map(t => t.agendados) || [],
    },
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Header with Filters and Export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">
          {isSupervisor ? 'Dashboard da Equipe' : 'Meu Dashboard'}
        </h2>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Operator Filter - Only for Supervisors */}
          {isSupervisor && availableOperators.length > 0 && (
            <Select value={selectedOperator} onValueChange={setSelectedOperator}>
              <SelectTrigger className="w-48">
                <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Operadores</SelectItem>
                {availableOperators.map((op) => (
                  <SelectItem key={op.bitrix_id} value={String(op.bitrix_id)}>
                    {op.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Period Filter */}
          <Select value={period} onValueChange={(v) => {
            setPeriod(v as PeriodFilter);
            if (v === 'custom') {
              setDatePopoverOpen(true);
            }
          }}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="yesterday">Ontem</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="last7days">Últimos 7 dias</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="custom">Intervalo</SelectItem>
            </SelectContent>
          </Select>

          {/* Custom Date Range Picker */}
          {period === 'custom' && (
            <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  {customDateRange?.from && customDateRange?.to 
                    ? `${format(customDateRange.from, 'dd/MM', { locale: ptBR })} - ${format(customDateRange.to, 'dd/MM', { locale: ptBR })}`
                    : 'Selecionar'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="start" side="bottom">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={customDateRange?.from}
                  selected={customDateRange}
                  onSelect={(range) => {
                    setCustomDateRange(range);
                    if (range?.from && range?.to) {
                      setDatePopoverOpen(false);
                    }
                  }}
                  numberOfMonths={1}
                  locale={ptBR}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          )}

          {/* AI Analysis Button - Only for Supervisors */}
          {isSupervisor && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleOpenAIAnalysis}
              disabled={!metrics || metrics.totalLeads === 0}
              className="gap-2"
            >
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">Análise IA</span>
            </Button>
          )}

          {/* Export Menu - Only for Supervisors */}
          {isSupervisor && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Share2 className="w-4 h-4 mr-2" />
                  )}
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileDown className="w-4 h-4 mr-2" />
                  Baixar PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleGenerateLink}>
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Gerar Link Compartilhável
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* KPI Cards - Clickable */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card 
            key={kpi.title} 
            className={`relative overflow-hidden ${kpi.onClick ? 'cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all' : ''}`}
            onClick={kpi.onClick}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.title}</p>
                  {'subtitle' in kpi && kpi.subtitle && (
                    <p className="text-[10px] text-muted-foreground/80 mt-0.5 truncate max-w-[140px]">{kpi.subtitle}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabulação Cards - Clickable (igual aos KPIs principais) */}
      {metrics?.tabulacaoGroups && metrics.tabulacaoGroups.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Por Tabulação</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.tabulacaoGroups
              .filter(tab => !tab.label.toLowerCase().includes('agendado'))
              .slice(0, 8)
              .map((tab) => (
              <Card 
                key={tab.label}
                className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                onClick={() => handleKpiClick('tabulacao', tab.label, tab.label)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Phone className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{tab.count}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[120px]" title={tab.label}>{tab.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

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

        {/* Horizontal Bar Chart - Status Distribution */}
        {donutLabels.length > 0 && (
          <ApexHorizontalBarChart
            title="Distribuição de Status"
            categories={donutLabels}
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
              Ranking de Operadores (por Agendamentos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Operador</TableHead>
                  <TableHead className="text-center">Agendamentos</TableHead>
                  <TableHead className="text-center">Leads</TableHead>
                  <TableHead className="text-center">Scouter</TableHead>
                  <TableHead className="text-center">Meta</TableHead>
                  <TableHead className="text-center">Conversão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.operatorPerformance.map((op, index) => {
                  const taxa = op.leads > 0 ? ((op.agendamentos / op.leads) * 100).toFixed(1) : '0.0';
                  return (
                    <TableRow key={op.name}>
                      <TableCell>
                        {index === 0 && <Badge className="bg-yellow-500">🥇</Badge>}
                        {index === 1 && <Badge className="bg-gray-400">🥈</Badge>}
                        {index === 2 && <Badge className="bg-orange-600">🥉</Badge>}
                        {index > 2 && <span className="text-muted-foreground">{index + 1}</span>}
                      </TableCell>
                      <TableCell className="font-medium">{op.name}</TableCell>
                      <TableCell className="text-center text-orange-600 font-bold">{op.agendamentos}</TableCell>
                      <TableCell className="text-center">{op.leads}</TableCell>
                      <TableCell className="text-center text-teal-600 dark:text-teal-400">{op.leadsScouter}</TableCell>
                      <TableCell className="text-center text-blue-600 dark:text-blue-400">{op.leadsMeta}</TableCell>
                      <TableCell className="text-center">{taxa}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Ranking de Comparecimentos (only for supervisors) */}
      {isSupervisor && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <PartyPopper className="w-5 h-5 text-green-500" />
                Ranking de Comparecimentos
              </CardTitle>
              <Select value={comparecimentosPeriod} onValueChange={(v) => setComparecimentosPeriod(v as ComparecimentosPeriod)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Semana</SelectItem>
                  <SelectItem value="month">Mês</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isComparecimentosLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : comparecimentosRanking.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum comparecimento registrado no período</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Operador</TableHead>
                    <TableHead className="text-center">Comparecimentos</TableHead>
                    <TableHead className="text-center">% do Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparecimentosRanking.map((op, index) => {
                    const totalComparecimentos = comparecimentosRanking.reduce((acc, curr) => acc + curr.total, 0);
                    const percentage = totalComparecimentos > 0 ? ((op.total / totalComparecimentos) * 100).toFixed(1) : '0.0';
                    return (
                      <TableRow key={op.bitrix_telemarketing_id}>
                        <TableCell>
                          {index === 0 && <Badge className="bg-yellow-500">🥇</Badge>}
                          {index === 1 && <Badge className="bg-gray-400">🥈</Badge>}
                          {index === 2 && <Badge className="bg-orange-600">🥉</Badge>}
                          {index > 2 && <span className="text-muted-foreground">{index + 1}</span>}
                        </TableCell>
                        <TableCell className="font-medium">{op.operator_name}</TableCell>
                        <TableCell className="text-center text-green-600 font-bold">{op.total}</TableCell>
                        <TableCell className="text-center">{percentage}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Top 5 Scouters - Only for Supervisors */}
      {isSupervisor && metrics?.scouterPerformance && metrics.scouterPerformance.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="w-5 h-5 text-teal-500" />
              Top 5 Scouters (por Agendamentos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Scouter</TableHead>
                  <TableHead className="text-center">Agendamentos</TableHead>
                  <TableHead className="text-center">Leads</TableHead>
                  <TableHead className="text-center">Conversão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.scouterPerformance.map((scouter, index) => (
                  <TableRow key={scouter.name}>
                    <TableCell>
                      {index === 0 && <Badge className="bg-yellow-500">🥇</Badge>}
                      {index === 1 && <Badge className="bg-gray-400">🥈</Badge>}
                      {index === 2 && <Badge className="bg-orange-600">🥉</Badge>}
                      {index > 2 && <span className="text-muted-foreground">{index + 1}</span>}
                    </TableCell>
                    <TableCell className="font-medium">{scouter.name}</TableCell>
                    <TableCell className="text-center text-teal-600 dark:text-teal-400 font-bold">{scouter.agendamentos}</TableCell>
                    <TableCell className="text-center">{scouter.totalLeads}</TableCell>
                    <TableCell className="text-center">{scouter.taxaConversao.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
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

      {/* Leads Detail Modal */}
      <LeadsDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        leads={metrics?.leadsDetails || []}
        type={modalType}
        title={modalTitle}
        filterStatus={filterStatus}
      />

      {/* Share Report Modal */}
      <ShareReportModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        url={shareUrl}
        expiresAt={shareExpiresAt}
      />

      {/* Agendamentos por Data Modal */}
      <AgendamentosPorDataModal
        open={agendamentosModalOpen}
        onOpenChange={setAgendamentosModalOpen}
        agendamentos={metrics?.agendamentosPorData || []}
        totalAgendamentos={metrics?.agendamentos || 0}
      />

      {/* Comparecimentos Modal */}
      <ComparecimentosDetailModal
        open={comparecimentosModalOpen}
        onOpenChange={setComparecimentosModalOpen}
        comparecimentos={metrics?.comparecimentos?.leads || []}
        totalComparecimentos={metrics?.comparecimentos?.total || 0}
      />

      {/* AI Analysis Modal */}
      <TelemarketingAIAnalysisModal
        open={aiAnalysisOpen}
        onClose={handleCloseAIAnalysis}
        analysis={analysis}
        isLoading={isAnalysisLoading}
        error={analysisError}
        periodLabel={getPeriodLabel()}
      />
    </div>
  );
}

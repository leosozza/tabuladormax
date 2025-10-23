// @ts-nocheck
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Filter,
  Calendar,
  RefreshCw,
  CheckCircle2,
  Camera,
  MessageSquare,
  Phone,
  Clock,
  UserCheck,
  Users,
  TrendingUp,
  XCircle,
  AlertTriangle,
  Target,
  BarChart3
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { getLeads } from '@/repositories/leadsRepo';
import type { Lead } from '@/repositories/types';
import { LeadsPorDiaChart } from '@/components/charts/LeadsPorDiaChart';
import AIInsightsPanel from '@/components/insights/AIInsightsPanel';
import { useAppSettings } from '@/hooks/useAppSettings';
import { calculateAverageIQS, calculateTabulationMetrics } from '@/utils/iqsCalculation';
import { 
  calculateWorkingHours, 
  calculateAverageTimeBetweenLeads,
  formatHoursToReadable,
  formatMinutesToReadable
} from '@/utils/scouterMetrics';
import { useIndicatorConfigs } from '@/hooks/useIndicatorConfigs';
import { ConfigurableIndicator } from './ConfigurableIndicator';
import { IndicatorConfigModal } from './IndicatorConfigModal';
import { calculateIndicatorValue } from '@/utils/indicatorCalculations';
import type { IndicatorConfig } from '@/types/indicator';

interface PerformanceMetrics {
  totalLeads: number;
  comFoto: number;
  confirmadas: number;
  conseguiuContato: number;
  agendadas: number;
  compareceu: number;
  interesse: number;
  concluiuPositivo: number;
  concluiuNegativo: number;
  semInteresseDefinitivo: number;
  semContato: number;
  semInteresseMomento: number;
  iqsMedio: number;
  horasTrabalhadasMedia: number;
  tempoMedioEntreFichas: number;
}

export function PerformanceDashboard() {
  const { settings } = useAppSettings();
  const { configs, saveConfig, deleteConfig, resetToDefaults } = useIndicatorConfigs();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(new Date());
  const [editingIndicator, setEditingIndicator] = useState<IndicatorConfig | null>(null);
  const [isCreatingIndicator, setIsCreatingIndicator] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalLeads: 0,
    comFoto: 0,
    confirmadas: 0,
    conseguiuContato: 0,
    agendadas: 0,
    compareceu: 0,
    interesse: 0,
    concluiuPositivo: 0,
    concluiuNegativo: 0,
    semInteresseDefinitivo: 0,
    semContato: 0,
    semInteresseMomento: 0,
    iqsMedio: 0,
    horasTrabalhadasMedia: 0,
    tempoMedioEntreFichas: 0
  });

  // Filters state - no default dates to show all leads (like Leads page)
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [selectedScouters, setSelectedScouters] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  const availableColumns = ['id', 'projeto', 'scouter', 'criado_em', 'valor_ficha', 'etapa', 'nome', 'telefone', 'email', 'confirmado', 'ficha_confirmada'];

  const handleCreateIndicator = () => {
    const newIndicator: IndicatorConfig = {
      id: crypto.randomUUID(),
      indicator_key: `custom_${Date.now()}`,
      title: 'Novo Indicador',
      source_column: 'id',
      aggregation: 'count',
      chart_type: 'number',
      format: 'number',
      position: configs.length,
    };
    setEditingIndicator(newIndicator);
    setIsCreatingIndicator(true);
  };

  const handleSaveIndicator = (config: Partial<IndicatorConfig>) => {
    saveConfig.mutate(config);
    setIsCreatingIndicator(false);
  };

  const handleDeleteIndicator = (id: string) => {
    deleteConfig.mutate(id);
  };

  useEffect(() => {
    loadData();
  }, [dataInicio, dataFim, selectedScouters, selectedProjects]);

  // Recalculate metrics when settings change
  useEffect(() => {
    if (leads.length > 0 && settings) {
      calculateMetrics(leads);
    }
  }, [settings, leads]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const filters = {
        dataInicio: dataInicio || undefined,
        dataFim: dataFim || undefined,
        scouter: selectedScouters.length === 1 ? selectedScouters[0] : undefined,
        projeto: selectedProjects.length === 1 ? selectedProjects[0] : undefined,
      };

      console.log('🔄 [Dashboard] Carregando dados com filtros:', filters);
      const data = await getLeads(filters);
      console.log('✅ [Dashboard] Dados carregados:', data.length, 'fichas');
      
      setLeads(data);
      calculateMetrics(data);
      
      if (data.length === 0) {
        console.warn('⚠️ [Dashboard] Nenhuma ficha encontrada. Verifique:');
        console.warn('   - Se existem dados na tabela "fichas" do Supabase');
        console.warn('   - Se os filtros de data não estão muito restritivos');
        console.warn('   - Se a conexão com Supabase está funcionando');
      }
    } catch (error) {
      console.error('❌ [Dashboard] Erro ao carregar dados:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMetrics = (data: Lead[]) => {
    const total = data.length;
    
    // % com foto: considerar Cadastro_Existe_Foto === "SIM" OU Foto == 1
    const comFoto = data.filter(lead => 
      lead.cadastro_existe_foto === 'SIM' || lead.foto === '1'
    ).length;
    
    // % confirmadas: considerar Ficha_confirmada === "Confirmada" OU Confirmado == 1
    const confirmadas = data.filter(lead => 
      lead.ficha_confirmada === 'Confirmada' || lead.confirmado === '1'
    ).length;
    
    const conseguiuContato = data.filter(lead => lead.presenca_confirmada === 'Sim').length;
    
    // Agendadas e Compareceu
    const agendadas = data.filter(lead => lead.agendado === '1').length;
    const compareceu = data.filter(lead => lead.compareceu === '1').length;

    // Métricas de tabulação
    const tabulationMetrics = calculateTabulationMetrics(data);

    // Calcular IQS médio usando as configurações atuais
    const iqsMedio = settings 
      ? calculateAverageIQS(data, settings) 
      : 0;

    // Calcular métricas de tempo de trabalho
    const workingHoursData = calculateWorkingHours(data);
    const timeBetweenFichasData = calculateAverageTimeBetweenLeads(data);

    setMetrics({
      totalLeads: total,
      comFoto,
      confirmadas,
      conseguiuContato,
      agendadas,
      compareceu,
      interesse: tabulationMetrics.interesse,
      concluiuPositivo: tabulationMetrics.conclusaoPositiva,
      concluiuNegativo: tabulationMetrics.conclusaoNegativa,
      semInteresseDefinitivo: tabulationMetrics.semInteresseDefinitivo,
      semContato: tabulationMetrics.semContato,
      semInteresseMomento: tabulationMetrics.semInteresseMomento,
      iqsMedio: Number(iqsMedio.toFixed(1)),
      horasTrabalhadasMedia: workingHoursData.averageHoursPerDay,
      tempoMedioEntreFichas: timeBetweenFichasData.averageMinutes
    });
  };

  const handleSync = async () => {
    setIsSyncing(true);
    // Simulate sync process
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSyncing(false);
    setLastSync(new Date());
    await loadData();
  };

  const getScouterOptions = () => {
    return Array.from(new Set(leads.map(lead => lead.scouter).filter(Boolean)))
      .map(scouter => ({ value: scouter, label: scouter }));
  };

  const getProjectOptions = () => {
    return Array.from(new Set(leads.map(lead => lead.projetos).filter(Boolean)))
      .map(project => ({ value: project, label: project }));
  };

  const getPercentage = (value: number, total: number) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
  };

  const MetricCard = ({ 
    title, 
    value, 
    percentage, 
    icon: Icon, 
    iconColor, 
    bgColor 
  }: {
    title: string;
    value: number | string;
    percentage?: string;
    icon: any;
    iconColor: string;
    bgColor: string;
  }) => (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="space-y-1">
              {typeof value === 'string' ? (
                <p className="text-2xl font-bold">{value}</p>
              ) : typeof value === 'number' && value !== undefined ? (
                <>
                  <p className="text-2xl font-bold">{value.toLocaleString('pt-BR')}</p>
                  {percentage && (
                    <p className="text-lg font-semibold text-foreground">{percentage}%</p>
                  )}
                </>
              ) : (
                <p className="text-2xl font-bold">{percentage || '0.0%'}</p>
              )}
            </div>
          </div>
          <div className={cn("p-3 rounded-full", bgColor)}>
            <Icon className={cn("h-6 w-6", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{metrics.totalLeads.toLocaleString('pt-BR')} leads encontradas</span>
            <span className="text-sm text-muted-foreground">IQS Médio: {metrics.iqsMedio}</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between w-full">
              <div>
                <strong>Erro ao carregar dados:</strong> {error}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                className="ml-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filtros:</span>
              </div>
              
              {/* Date Range - Separate inputs like Projeção page */}
              <div className="flex items-center gap-2">
                <div>
                  <Label className="text-xs font-medium mb-1 block">Data Início</Label>
                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Data Fim</Label>
                  <Input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-40"
                  />
                </div>
              </div>

              {/* Scouters */}
              <Select value={selectedScouters[0] || 'all'} onValueChange={(value) => setSelectedScouters(value === 'all' ? [] : [value])}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Scouters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Scouters</SelectItem>
                  {getScouterOptions().map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Projects */}
              <Select value={selectedProjects[0] || 'all'} onValueChange={(value) => setSelectedProjects(value === 'all' ? [] : [value])}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Projetos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Projetos</SelectItem>
                  {getProjectOptions().map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Sync Status */}
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span>Dados sincronizados com TabuladorMax</span>
              <span className="text-xs text-muted-foreground">
                Tabela: leads
              </span>
              <Badge variant="outline" className="text-xs">
                {metrics.totalLeads.toLocaleString('pt-BR')} registros
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => resetToDefaults.mutate()}
                className="gap-2"
              >
                Restaurar Padrão
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={isSyncing}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                Atualizar
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>

      {/* Configurable Indicators */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Indicadores Configuráveis</h2>
          <Button onClick={handleCreateIndicator} size="sm" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Novo Indicador
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {configs.map((config) => (
            <ConfigurableIndicator
              key={config.indicator_key}
              config={config}
              value={calculateIndicatorValue(leads, config)}
              data={leads}
              onEdit={() => {
                setEditingIndicator(config);
                setIsCreatingIndicator(false);
              }}
              onDelete={config.id ? () => handleDeleteIndicator(config.id) : undefined}
            />
          ))}
        </div>
      </div>

      {/* Indicator Config Modal */}
      <IndicatorConfigModal
        open={!!editingIndicator}
        onOpenChange={(open) => {
          if (!open) {
            setEditingIndicator(null);
            setIsCreatingIndicator(false);
          }
        }}
        config={editingIndicator}
        onSave={handleSaveIndicator}
        availableColumns={availableColumns}
        data={leads}
        isCreating={isCreatingIndicator}
      />

      {/* Charts & AI Insights */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Gráfico de Barras por Dia */}
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-2 text-sm font-medium">
            Leads por dia {dataInicio && dataFim ? `(${new Date(dataInicio).toLocaleDateString('pt-BR')} – ${new Date(dataFim).toLocaleDateString('pt-BR')})` : '(Todos os períodos)'}
          </div>
          <LeadsPorDiaChart
            startDate={dataInicio ? new Date(dataInicio) : addDays(new Date(), -30)}
            endDate={dataFim ? new Date(dataFim) : new Date()}
            rows={leads}
            height={280}
          />
        </div>

        {/* Painel de IA */}
        <AIInsightsPanel
          startDate={dataInicio ? new Date(dataInicio) : addDays(new Date(), -30)}
          endDate={dataFim ? new Date(dataFim) : new Date()}
          rows={leads}
          projectName={selectedProjects[0] || null}
        />
      </div>

      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total de Leads"
          value={metrics.totalLeads}
          icon={BarChart3}
          iconColor="text-blue-600"
          bgColor="bg-blue-100"
        />
        
        <MetricCard
          title="% com Foto"
          value={metrics.comFoto}
          percentage={getPercentage(metrics.comFoto, metrics.totalLeads)}
          icon={Camera}
          iconColor="text-blue-600"
          bgColor="bg-blue-100"
        />

        <MetricCard
          title="% Confirmadas"
          value={metrics.confirmadas}
          percentage={getPercentage(metrics.confirmadas, metrics.totalLeads)}
          icon={CheckCircle2}
          iconColor="text-green-600"
          bgColor="bg-green-100"
        />

        <MetricCard
          title="% Conseguiu Contato"
          value={metrics.conseguiuContato}
          percentage={getPercentage(metrics.conseguiuContato, metrics.totalLeads)}
          icon={Phone}
          iconColor="text-orange-600"
          bgColor="bg-orange-100"
        />

        <MetricCard
          title="% Agendadas"
          value={metrics.agendadas}
          percentage={getPercentage(metrics.agendadas, metrics.totalLeads)}
          icon={Calendar}
          iconColor="text-purple-600"
          bgColor="bg-purple-100"
        />

        <MetricCard
          title="% Compareceu"
          value={metrics.compareceu}
          percentage={getPercentage(metrics.compareceu, metrics.totalLeads)}
          icon={UserCheck}
          iconColor="text-green-600"
          bgColor="bg-green-100"
        />

        <MetricCard
          title="% Interesse"
          value={metrics.interesse}
          percentage={getPercentage(metrics.interesse, metrics.totalLeads)}
          icon={TrendingUp}
          iconColor="text-pink-600"
          bgColor="bg-pink-100"
        />

        <MetricCard
          title="% Concluído Positivo"
          value={metrics.concluiuPositivo}
          percentage={getPercentage(metrics.concluiuPositivo, metrics.totalLeads)}
          icon={CheckCircle2}
          iconColor="text-green-600"
          bgColor="bg-green-100"
        />

        <MetricCard
          title="% Concluído Negativo"
          value={metrics.concluiuNegativo}
          percentage={getPercentage(metrics.concluiuNegativo, metrics.totalLeads)}
          icon={XCircle}
          iconColor="text-red-600"
          bgColor="bg-red-100"
        />

        <MetricCard
          title="% Sem Interesse Definitivo"
          value={metrics.semInteresseDefinitivo}
          percentage={getPercentage(metrics.semInteresseDefinitivo, metrics.totalLeads)}
          icon={XCircle}
          iconColor="text-red-600"
          bgColor="bg-red-100"
        />

        <MetricCard
          title="% Sem Contato"
          value={metrics.semContato}
          percentage={getPercentage(metrics.semContato, metrics.totalLeads)}
          icon={Phone}
          iconColor="text-gray-600"
          bgColor="bg-gray-100"
        />

        <MetricCard
          title="% Sem Interesse Momento"
          value={metrics.semInteresseMomento}
          percentage={getPercentage(metrics.semInteresseMomento, metrics.totalLeads)}
          icon={Clock}
          iconColor="text-yellow-600"
          bgColor="bg-yellow-100"
        />

        <MetricCard
          title="Horas Trabalhadas (Média/Dia)"
          value={formatHoursToReadable(metrics.horasTrabalhadasMedia)}
          icon={Clock}
          iconColor="text-indigo-600"
          bgColor="bg-indigo-100"
        />

        <MetricCard
          title="Tempo Médio Entre Leads"
          value={formatMinutesToReadable(metrics.tempoMedioEntreFichas)}
          icon={Clock}
          iconColor="text-teal-600"
          bgColor="bg-teal-100"
        />
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Resumo de Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-green-600">0.0%</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">IQS Médio</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-blue-600">{metrics.iqsMedio}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alert Points */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Pontos de Atenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  Baixo índice de leads com foto ({getPercentage(metrics.comFoto, metrics.totalLeads)}%)
                </AlertDescription>
              </Alert>
              
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  Baixo índice de confirmação WhatsApp ({getPercentage(metrics.confirmadas, metrics.totalLeads)}%)
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
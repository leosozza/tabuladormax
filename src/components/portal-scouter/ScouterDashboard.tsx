import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { LogOut, RefreshCw, Trophy, Medal, Bot, CalendarIcon, Building, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScouterStatsCards } from './ScouterStatsCards';
import { PhotoUploadDialog } from './PhotoUploadDialog';
import { ScouterLeadsModal } from './ScouterLeadsModal';
import { AIAnalysisModal } from './AIAnalysisModal';
import { ScouterOnboardingGuide } from './ScouterOnboardingGuide';
import { useScouterAIAnalysis } from '@/hooks/useScouterAIAnalysis';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, subDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ScouterDashboardProps {
  scouterData: {
    id: string;
    name: string;
    photo: string | null;
  };
  onLogout: () => void;
}

export type DateRangePreset = 'today' | 'yesterday' | 'week' | 'last7days' | 'month' | 'custom';

export const ScouterDashboard = ({
  scouterData,
  onLogout
}: ScouterDashboardProps) => {
  const [datePreset, setDatePreset] = useState<DateRangePreset>('today');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [projectId, setProjectId] = useState<string | null>(null);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(scouterData.photo);
  
  // State para o modal de leads
  const [leadsModalOpen, setLeadsModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<{ type: string; label: string }>({ type: 'all', label: 'Total de Leads' });
  
  // State para análise de IA
  const [aiAnalysisOpen, setAiAnalysisOpen] = useState(false);
  const { generateAnalysis, isAnalyzing, analysisResult, clearAnalysis } = useScouterAIAnalysis();

  // State para onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Verificar se deve mostrar onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const { data, error } = await supabase
          .from('scouters')
          .select('onboarding_completed')
          .eq('id', scouterData.id)
          .single();
        
        if (!error && data && !data.onboarding_completed) {
          // Pequeno delay para garantir que a UI carregou
          setTimeout(() => setShowOnboarding(true), 500);
        }
      } catch (err) {
        console.error('Erro ao verificar onboarding:', err);
      }
    };
    
    checkOnboarding();
  }, [scouterData.id]);

  // Handler para completar onboarding
  const handleCompleteOnboarding = async (dontShowAgain: boolean) => {
    setShowOnboarding(false);
    
    if (dontShowAgain) {
      try {
        await supabase
          .from('scouters')
          .update({ onboarding_completed: true })
          .eq('id', scouterData.id);
      } catch (err) {
        console.error('Erro ao salvar preferência de onboarding:', err);
      }
    }
  };

  const getDateRange = () => {
    const now = new Date();
    switch (datePreset) {
      case 'today':
        return {
          start: startOfDay(now),
          end: endOfDay(now)
        };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return {
          start: startOfDay(yesterday),
          end: endOfDay(yesterday)
        };
      case 'week':
        return {
          start: startOfWeek(now, {
            weekStartsOn: 1
          }),
          end: endOfDay(now)
        };
      case 'last7days':
        return {
          start: startOfDay(subDays(now, 6)),
          end: endOfDay(now)
        };
      case 'month':
        return {
          start: startOfMonth(now),
          end: endOfDay(now)
        };
      case 'custom':
        return {
          start: customDateRange.start ? startOfDay(customDateRange.start) : startOfDay(now),
          end: customDateRange.end ? endOfDay(customDateRange.end) : endOfDay(now)
        };
    }
  };

  const { start, end } = getDateRange();

  // Buscar projetos do scouter
  const { data: projects = [] } = useQuery({
    queryKey: ['scouter-projects', scouterData.name],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_scouter_projects', {
        p_scouter_name: scouterData.name
      });
      if (error) throw error;
      return data || [];
    }
  });

  // Buscar estatísticas
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['scouter-portal-stats', scouterData.name, start?.toISOString(), end?.toISOString(), projectId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_scouter_portal_stats', {
        p_scouter_name: scouterData.name,
        p_start_date: start?.toISOString() || null,
        p_end_date: end?.toISOString() || null,
        p_project_id: projectId
      });
      if (error) throw error;
      return data?.[0] || null;
    }
  });

  // Buscar posição no ranking
  const { data: ranking } = useQuery({
    queryKey: ['scouter-ranking', scouterData.name, start?.toISOString(), end?.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_scouter_ranking_position', {
        p_scouter_name: scouterData.name,
        p_start_date: start?.toISOString() || null,
        p_end_date: end?.toISOString() || null
      });
      if (error) throw error;
      return data?.[0] || null;
    }
  });

  const handlePhotoUpdated = (newPhotoUrl: string) => {
    setCurrentPhoto(newPhotoUrl);
  };

  const handleCardClick = (filterType: string, label: string) => {
    setSelectedFilter({ type: filterType, label });
    setLeadsModalOpen(true);
  };

  const getRankingIcon = () => {
    if (!ranking) return <Trophy className="h-5 w-5 text-muted-foreground" />;
    if (ranking.rank_position === 1) {
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    } else if (ranking.rank_position === 2) {
      return <Medal className="h-5 w-5 text-gray-400" />;
    } else if (ranking.rank_position === 3) {
      return <Medal className="h-5 w-5 text-amber-600" />;
    }
    return null;
  };

  const getPeriodLabel = () => {
    const labels: Record<DateRangePreset, string> = {
      today: 'Hoje',
      yesterday: 'Ontem',
      week: 'Esta Semana',
      last7days: 'Últimos 7 dias',
      month: 'Este Mês',
      custom: customDateRange.start && customDateRange.end 
        ? `${format(customDateRange.start, 'dd/MM', { locale: ptBR })} - ${format(customDateRange.end, 'dd/MM', { locale: ptBR })}`
        : 'Intervalo',
    };
    return labels[datePreset];
  };

  const handleOpenAIAnalysis = async () => {
    setAiAnalysisOpen(true);
    await generateAnalysis(scouterData.name, getPeriodLabel(), stats, ranking);
  };

  const handleCloseAIAnalysis = () => {
    setAiAnalysisOpen(false);
    clearAnalysis();
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Área do perfil */}
            <div className="flex items-center gap-4">
              {/* Foto clicável para trocar */}
              <Avatar 
                className="h-20 w-20 border-4 border-primary/20 shadow-lg ring-2 ring-primary/10 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setShowPhotoDialog(true)}
              >
                <AvatarImage src={currentPhoto || undefined} className="object-cover" />
                <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                  {scouterData.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              {/* Info do scouter */}
              <div className="flex flex-col">
                <h1 className="font-bold text-lg">Olá, {scouterData.name}!</h1>
                <p className="text-sm text-muted-foreground">Portal do Scouter</p>
                
                {/* Ranking badge */}
                {ranking && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    {getRankingIcon()}
                  </div>
                )}
              </div>
            </div>

            {/* Botões de ação */}
            <div className="gap-2 flex-col flex items-start justify-end">
              <Button variant="ghost" size="icon" onClick={onLogout}>
                <LogOut className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Card de Ranking detalhado */}
        {ranking && (
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    {getRankingIcon()}
                  </div>
                  <div>
                    <p className="font-semibold text-lg">
                      {ranking.rank_position}º lugar no ranking
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Suas fichas: <span className="font-medium text-foreground">{ranking.scouter_fichas}</span>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtros e Ações - Tudo em uma linha */}
        <div className="flex items-center justify-between gap-4">
          {/* Botão Análise IA */}
          <Button
            data-tour="ai-analysis"
            variant="default"
            size="sm"
            onClick={handleOpenAIAnalysis}
            disabled={isAnalyzing || !stats}
            className="gap-2"
          >
            <Bot className="h-4 w-4" />
            Análise IA
          </Button>
          
          {/* Ícones de Filtro */}
          <div className="flex items-center gap-1">
            {/* Ícone de Data com Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button data-tour="date-filter" variant="ghost" size="icon" className="h-9 w-9 relative">
                  <CalendarIcon className="h-4 w-4" />
                  {datePreset !== 'today' && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-muted-foreground px-2 pb-1 border-b mb-1">Período</p>
                  {[
                    { value: 'today', label: 'Hoje' },
                    { value: 'yesterday', label: 'Ontem' },
                    { value: 'week', label: 'Esta Semana' },
                    { value: 'last7days', label: 'Últimos 7 dias' },
                    { value: 'month', label: 'Este Mês' },
                    { value: 'custom', label: 'Intervalo' },
                  ].map((option) => (
                    <Button
                      key={option.value}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "justify-start font-normal",
                        datePreset === option.value && "bg-accent font-medium"
                      )}
                      onClick={() => setDatePreset(option.value as DateRangePreset)}
                    >
                      {datePreset === option.value && <Check className="h-4 w-4 mr-2" />}
                      {option.label}
                    </Button>
                  ))}
                  
                  {/* Seletor de datas quando "Intervalo" está ativo */}
                  {datePreset === 'custom' && (
                    <div className="pt-2 border-t mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "flex-1 justify-start text-left font-normal",
                                !customDateRange.start && "text-muted-foreground"
                              )}
                            >
                              {customDateRange.start ? (
                                format(customDateRange.start, "dd/MM/yyyy", { locale: ptBR })
                              ) : (
                                <span>De</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={customDateRange.start || undefined}
                              onSelect={(date) => setCustomDateRange({ ...customDateRange, start: date || null })}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                        <span className="text-xs text-muted-foreground">até</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "flex-1 justify-start text-left font-normal",
                                !customDateRange.end && "text-muted-foreground"
                              )}
                            >
                              {customDateRange.end ? (
                                format(customDateRange.end, "dd/MM/yyyy", { locale: ptBR })
                              ) : (
                                <span>Até</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                              mode="single"
                              selected={customDateRange.end || undefined}
                              onSelect={(date) => setCustomDateRange({ ...customDateRange, end: date || null })}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Ícone de Projeto com Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button data-tour="project-filter" variant="ghost" size="icon" className="h-9 w-9 relative">
                  <Building className="h-4 w-4" />
                  {projectId && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="end">
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-muted-foreground px-2 pb-1 border-b mb-1">Projeto</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "justify-start font-normal",
                      !projectId && "bg-accent font-medium"
                    )}
                    onClick={() => setProjectId(null)}
                  >
                    {!projectId && <Check className="h-4 w-4 mr-2" />}
                    Todos os Projetos
                  </Button>
                  {projects.map((project) => (
                    <Button
                      key={project.project_id}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "justify-start font-normal",
                        projectId === project.project_id && "bg-accent font-medium"
                      )}
                      onClick={() => setProjectId(project.project_id)}
                    >
                      {projectId === project.project_id && <Check className="h-4 w-4 mr-2" />}
                      {project.project_name} ({project.lead_count})
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div data-tour="stats-cards">
          <ScouterStatsCards 
            stats={stats} 
            isLoading={isLoading} 
            onCardClick={handleCardClick}
          />
        </div>
      </main>

      {/* Dialog de upload de foto */}
      <PhotoUploadDialog 
        open={showPhotoDialog} 
        onOpenChange={setShowPhotoDialog} 
        scouterId={scouterData.id} 
        scouterName={scouterData.name} 
        currentPhoto={currentPhoto} 
        onPhotoUpdated={handlePhotoUpdated} 
      />

      {/* Modal de análise de IA */}
      <AIAnalysisModal
        isOpen={aiAnalysisOpen}
        onClose={handleCloseAIAnalysis}
        analysis={analysisResult?.analysis || null}
        isLoading={isAnalyzing}
        scouterName={scouterData.name}
        periodLabel={getPeriodLabel()}
        metrics={analysisResult?.metrics}
      />

      {/* Modal de leads */}
      <ScouterLeadsModal
        isOpen={leadsModalOpen}
        onClose={() => setLeadsModalOpen(false)}
        scouterName={scouterData.name}
        filterType={selectedFilter.type}
        filterLabel={selectedFilter.label}
        dateFrom={start}
        dateTo={end}
        projectId={projectId}
      />

      {/* Guia de Onboarding */}
      <ScouterOnboardingGuide
        isOpen={showOnboarding}
        onComplete={handleCompleteOnboarding}
      />
    </div>
  );
};

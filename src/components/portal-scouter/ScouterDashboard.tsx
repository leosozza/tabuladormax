import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { LogOut, RefreshCw, Trophy, Medal, Bot, FileText, Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScouterStatsCards } from './ScouterStatsCards';
import { ScouterFilters } from './ScouterFilters';
import { PhotoUploadDialog } from './PhotoUploadDialog';
import { ScouterLeadsModal } from './ScouterLeadsModal';
import { AIAnalysisModal } from './AIAnalysisModal';
import { useScouterAIAnalysis } from '@/hooks/useScouterAIAnalysis';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, subDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

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

  const handleGenerateLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado para a área de transferência!');
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

        {/* Filtros e Ações */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <ScouterFilters 
            datePreset={datePreset} 
            onDatePresetChange={setDatePreset} 
            customDateRange={customDateRange}
            onCustomDateRangeChange={setCustomDateRange}
            projectId={projectId} 
            onProjectChange={setProjectId} 
            projects={projects} 
          />
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="default"
              size="sm"
              onClick={handleOpenAIAnalysis}
              disabled={isAnalyzing || !stats}
              className="gap-2"
            >
              <Bot className="h-4 w-4" />
              Análise IA
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateLink}
              className="gap-2"
            >
              <Link2 className="h-4 w-4" />
              Compartilhar
            </Button>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <ScouterStatsCards 
          stats={stats} 
          isLoading={isLoading} 
          onCardClick={handleCardClick}
        />
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
        onGenerateLink={handleGenerateLink}
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
    </div>
  );
};

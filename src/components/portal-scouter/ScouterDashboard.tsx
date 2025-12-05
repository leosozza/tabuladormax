import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { LogOut, RefreshCw, Camera, Trophy, Medal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScouterStatsCards } from './ScouterStatsCards';
import { ScouterFilters } from './ScouterFilters';
import { PhotoUploadDialog } from './PhotoUploadDialog';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, subDays } from 'date-fns';

interface ScouterDashboardProps {
  scouterData: {
    id: string;
    name: string;
    photo: string | null;
  };
  onLogout: () => void;
}

export type DateRangePreset = 'today' | 'week' | 'month' | '30days' | 'all' | 'custom';

export const ScouterDashboard = ({ scouterData, onLogout }: ScouterDashboardProps) => {
  const [datePreset, setDatePreset] = useState<DateRangePreset>('all');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date } | null>(null);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(scouterData.photo);

  const getDateRange = () => {
    const now = new Date();
    switch (datePreset) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfDay(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfDay(now) };
      case '30days':
        return { start: subDays(now, 30), end: endOfDay(now) };
      case 'custom':
        if (customRange) {
          return { start: startOfDay(customRange.from), end: endOfDay(customRange.to) };
        }
        return { start: null, end: null };
      case 'all':
      default:
        return { start: null, end: null };
    }
  };

  const { start, end } = getDateRange();

  // Buscar projetos do scouter
  const { data: projects = [] } = useQuery({
    queryKey: ['scouter-projects', scouterData.name],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_scouter_projects', { p_scouter_name: scouterData.name });

      if (error) throw error;
      return data || [];
    }
  });

  // Buscar estatísticas
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['scouter-portal-stats', scouterData.name, start?.toISOString(), end?.toISOString(), projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_scouter_portal_stats', {
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
      const { data, error } = await supabase
        .rpc('get_scouter_ranking_position', {
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

  const getRankingIcon = () => {
    if (!ranking) return <Trophy className="h-5 w-5 text-muted-foreground" />;
    
    if (ranking.rank_position === 1) {
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    } else if (ranking.rank_position === 2) {
      return <Medal className="h-5 w-5 text-gray-400" />;
    } else if (ranking.rank_position === 3) {
      return <Medal className="h-5 w-5 text-amber-600" />;
    }
    return <Trophy className="h-5 w-5 text-primary/60" />;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Área do perfil */}
            <div className="flex items-center gap-4">
              {/* Foto maior com botão de edição */}
              <div className="relative">
                <Avatar className="h-20 w-20 border-4 border-primary/20 shadow-lg ring-2 ring-primary/10">
                  <AvatarImage src={currentPhoto || undefined} className="object-cover" />
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                    {scouterData.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-md border-2 border-background"
                  onClick={() => setShowPhotoDialog(true)}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>

              {/* Info do scouter */}
              <div className="flex flex-col">
                <h1 className="font-bold text-lg">Olá, {scouterData.name}!</h1>
                <p className="text-sm text-muted-foreground">Portal do Scouter</p>
                
                {/* Ranking badge */}
                {ranking && (
                  <div className="flex items-center gap-1.5 mt-1">
                    {getRankingIcon()}
                    <span className="text-sm font-medium">
                      {ranking.rank_position}º lugar de {ranking.total_scouters}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onLogout}>
                <LogOut className="h-4 w-4" />
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
                
                {ranking.rank_position > 1 && ranking.first_place_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span className="text-muted-foreground">
                      1º lugar: <span className="font-medium text-foreground">{ranking.first_place_name}</span>
                      {' '}({ranking.first_place_fichas} fichas)
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtros */}
        <ScouterFilters
          datePreset={datePreset}
          onDatePresetChange={setDatePreset}
          projectId={projectId}
          onProjectChange={setProjectId}
          projects={projects}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
        />

        {/* Cards de Estatísticas */}
        <ScouterStatsCards stats={stats} isLoading={isLoading} />
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
    </div>
  );
};

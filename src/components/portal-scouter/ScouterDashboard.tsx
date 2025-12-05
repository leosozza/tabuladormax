import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScouterStatsCards } from './ScouterStatsCards';
import { ScouterFilters } from './ScouterFilters';
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
  const [datePreset, setDatePreset] = useState<DateRangePreset>('month');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date } | null>(null);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={scouterData.photo || undefined} />
              <AvatarFallback>{scouterData.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-semibold text-lg">Olá, {scouterData.name}!</h1>
              <p className="text-sm text-muted-foreground">Portal do Scouter</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
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
    </div>
  );
};

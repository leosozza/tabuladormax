import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ProducerStatsCards } from './ProducerStatsCards';
import { ProducerDealsList } from './ProducerDealsList';
import { ProducerFilters } from './ProducerFilters';

interface ProducerDashboardProps {
  producerData: {
    id: string;
    name: string;
    photo: string | null;
  };
  onLogout: () => void;
}

export type DealStatusFilter = 'all' | 'pendentes' | 'em_andamento' | 'concluidos';

export const ProducerDashboard = ({
  producerData,
  onLogout
}: ProducerDashboardProps) => {
  const [statusFilter, setStatusFilter] = useState<DealStatusFilter>('all');

  // Buscar estatísticas do produtor
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['producer-stats', producerData.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_producer_stats', {
        p_producer_id: producerData.id
      });
      if (error) throw error;
      return data?.[0] || null;
    }
  });

  // Buscar deals do produtor
  const { data: deals = [], isLoading: dealsLoading, refetch: refetchDeals } = useQuery({
    queryKey: ['producer-deals', producerData.id, statusFilter],
    queryFn: async () => {
      // Mapear filtro para status
      let statusParam: string | null = null;
      if (statusFilter === 'pendentes') {
        statusParam = 'inicial';
      } else if (statusFilter === 'em_andamento') {
        statusParam = 'atendimento_produtor';
      } else if (statusFilter === 'concluidos') {
        statusParam = 'realizado';
      }

      const { data, error } = await supabase.rpc('get_producer_deals', {
        p_producer_id: producerData.id,
        p_status: statusParam,
        p_limit: 100
      });
      if (error) throw error;
      return data || [];
    }
  });

  const handleRefresh = () => {
    refetchStats();
    refetchDeals();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Área do perfil */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-4 border-primary/20 shadow-lg">
                <AvatarImage src={producerData.photo || undefined} className="object-cover" />
                <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                  {producerData.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col">
                <h1 className="font-bold text-lg">Olá, {producerData.name}!</h1>
                <p className="text-sm text-muted-foreground">Portal do Produtor</p>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handleRefresh}>
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
        {/* Cards de Estatísticas */}
        <ProducerStatsCards 
          stats={stats} 
          isLoading={statsLoading}
          onFilterClick={setStatusFilter}
        />

        {/* Filtros */}
        <ProducerFilters 
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        {/* Lista de Deals */}
        <ProducerDealsList 
          deals={deals}
          isLoading={dealsLoading}
          producerId={producerData.id}
          onRefresh={handleRefresh}
        />
      </main>
    </div>
  );
};

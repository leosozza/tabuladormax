import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ProducerStatsCards } from './ProducerStatsCards';

interface ProducerDashboardTabProps {
  producerId: string;
}

export const ProducerDashboardTab = ({ producerId }: ProducerDashboardTabProps) => {
  // Buscar estatísticas do produtor
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['producer-stats', producerId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_producer_stats', {
        p_producer_id: producerId
      });
      if (error) throw error;
      return data?.[0] || null;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Dashboard</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <ProducerStatsCards 
        stats={stats} 
        isLoading={isLoading}
        onFilterClick={() => {}} // No-op in dashboard view
      />
    </div>
  );
};

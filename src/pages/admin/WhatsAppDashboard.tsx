import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useWhatsAppDashboardStats } from '@/hooks/useWhatsAppDashboardStats';
import { WhatsAppKPICards } from '@/components/whatsapp-dashboard/WhatsAppKPICards';
import { WhatsAppVolumeChart } from '@/components/whatsapp-dashboard/WhatsAppVolumeChart';
import { WhatsAppStatusChart } from '@/components/whatsapp-dashboard/WhatsAppStatusChart';
import { WhatsAppHourlyChart } from '@/components/whatsapp-dashboard/WhatsAppHourlyChart';
import { WhatsAppOperatorRanking } from '@/components/whatsapp-dashboard/WhatsAppOperatorRanking';
import { WhatsAppPendingTable } from '@/components/whatsapp-dashboard/WhatsAppPendingTable';

export default function WhatsAppDashboard() {
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching } = useWhatsAppDashboardStats();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['whatsapp-dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['whatsapp-pending-conversations'] });
  };

  return (
    <AdminPageLayout
      title="Dashboard Central de Atendimento"
      description="Métricas e indicadores do WhatsApp"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      }
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <WhatsAppKPICards
          kpis={data?.kpis}
          closedCount={data?.closed_count}
          isLoading={isLoading}
        />

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WhatsAppVolumeChart data={data?.daily_volume} isLoading={isLoading} />
          <WhatsAppStatusChart data={data?.status_distribution} isLoading={isLoading} />
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WhatsAppHourlyChart data={data?.hourly_distribution} isLoading={isLoading} />
          <WhatsAppOperatorRanking data={data?.top_operators} isLoading={isLoading} />
        </div>

        {/* Pending Table */}
        <WhatsAppPendingTable />
      </div>
    </AdminPageLayout>
  );
}

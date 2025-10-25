import { PerformanceMonitoringDashboard } from '@/components/monitoring/PerformanceMonitoringDashboard';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';

export default function PerformanceMonitoring() {
  return (
    <AdminPageLayout
      title="Monitoramento de Performance"
      description="Monitore a performance do sistema em tempo real"
      backTo="/admin"
    >
      <PerformanceMonitoringDashboard />
    </AdminPageLayout>
  );
}

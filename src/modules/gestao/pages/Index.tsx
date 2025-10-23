import { AppShell } from '@/layouts/AppShell'
import { Sidebar } from '@/components/layout/Sidebar'
import { PerformanceDashboard } from '@/components/dashboard/PerformanceDashboard'

const Index = () => {
  return (
    <AppShell sidebar={<Sidebar />}>
      <PerformanceDashboard />
    </AppShell>
  );
};

export default Index;

import { PerformanceMonitoringDashboard } from '@/components/monitoring/PerformanceMonitoringDashboard';
import UserMenu from '@/components/UserMenu';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PerformanceMonitoring() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <h1 className="text-2xl font-bold">Performance Monitoring</h1>
            </div>
            <UserMenu />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <PerformanceMonitoringDashboard />
      </div>
    </div>
  );
}

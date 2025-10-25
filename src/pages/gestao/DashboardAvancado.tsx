import { useNavigate } from 'react-router-dom';
import { useDashboard } from '@/hooks/useDashboard';
import { DynamicWidget } from '@/components/dashboard/DynamicWidget';
import { DraggableGridLayout, DraggableWidget } from '@/components/dashboard/DraggableGridLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';

export default function AdvancedDashboard() {
  const navigate = useNavigate();
  const { dashboards, isLoading } = useDashboard();

  // Usar o primeiro dashboard ou dashboard padrão
  const activeDashboard = dashboards.find(d => d.is_default) || dashboards[0];

  if (isLoading) {
    return (
      <AdminPageLayout title="Dashboard Avançado" description="Carregando...">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </AdminPageLayout>
    );
  }

  const draggableWidgets: DraggableWidget[] = activeDashboard?.widgets.map((widget) => ({
    id: widget.id,
    title: widget.title,
    component: <DynamicWidget config={widget} />,
    size: {
      cols: widget.layout?.w || 6,
      rows: widget.layout?.h || 4,
    },
  })) || [];

  return (
    <AdminPageLayout
      title="Dashboard Avançado"
      description={activeDashboard?.description || 'Visualize dados com gráficos dinâmicos e personalizáveis'}
      actions={
        <Button onClick={() => navigate('/dashboard-manager')}>
          <Settings className="w-4 h-4 mr-2" />
          Gerenciar
        </Button>
      }
    >
      {activeDashboard ? (
        draggableWidgets.length > 0 ? (
          <DraggableGridLayout 
            widgets={draggableWidgets}
            gap={6}
            editable={false}
          />
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <Settings className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum widget configurado</h3>
              <p className="text-muted-foreground mb-4">
                Configure seu dashboard no gerenciador
              </p>
              <Button onClick={() => navigate('/dashboard-manager')}>
                <Plus className="w-4 h-4 mr-2" />
                Ir para Gerenciador
              </Button>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Settings className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum dashboard criado</h3>
            <p className="text-muted-foreground mb-4">
              Crie seu primeiro dashboard personalizado
            </p>
            <Button onClick={() => navigate('/dashboard-manager')}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Dashboard
            </Button>
          </CardContent>
        </Card>
      )}
    </AdminPageLayout>
  );
}

/**
 * Dashboard Avançado - Integração com o novo sistema de dashboard
 * Demonstra o uso do DashboardManager com persistência
 */

import { useNavigate } from 'react-router-dom';
import { useDashboard } from '@/hooks/useDashboard';
import { DynamicWidget } from '@/components/dashboard/DynamicWidget';
import { DraggableGridLayout, DraggableWidget } from '@/components/dashboard/DraggableGridLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, LayoutDashboard, Settings } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdvancedDashboard() {
  const navigate = useNavigate();
  const { dashboards, isLoading } = useDashboard();

  // Usar o primeiro dashboard ou dashboard padrão
  const activeDashboard = dashboards.find(d => d.is_default) || dashboards[0];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8" />
            Dashboard Avançado
          </h1>
          <p className="text-muted-foreground mt-1">
            {activeDashboard?.description || 'Visualize dados com gráficos dinâmicos e personalizáveis'}
          </p>
        </div>
        <Button onClick={() => navigate('/dashboard-manager')}>
          <Settings className="w-4 h-4 mr-2" />
          Gerenciar Dashboards
        </Button>
      </div>

      {/* Dashboard Content */}
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
            <LayoutDashboard className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
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

      {/* Info card */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Recursos do Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-disc list-inside space-y-2">
            <li>✅ Persistência automática de configurações</li>
            <li>✅ 13+ tipos de visualização (gráficos, tabelas, gauges)</li>
            <li>✅ Query Builder visual sem necessidade de código</li>
            <li>✅ Filtros avançados por data, projeto, scouter</li>
            <li>✅ Cache inteligente com React Query</li>
            <li>✅ Suporte a múltiplos dashboards personalizados</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

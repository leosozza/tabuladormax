/**
 * Dashboard Avançado - Exemplo de uso dos novos componentes
 * Demonstra o uso de widgets dinâmicos com ApexCharts e GridLayout
 */

import { useState } from 'react';
import { DynamicWidget } from '@/components/dashboard/DynamicWidget';
import { GridLayout, GridWidget } from '@/components/dashboard/builder/GridLayout';
import type { DashboardWidget } from '@/types/dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, BarChart3 } from 'lucide-react';

export default function AdvancedDashboard() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([
    {
      id: 'widget-1',
      title: 'Leads por Scouter',
      dimension: 'scouter',
      metrics: ['count_distinct_id'],
      chartType: 'bar',
      sortBy: 'count_distinct_id',
      sortOrder: 'desc',
      limit: 10,
    },
    {
      id: 'widget-2',
      title: 'Taxa de Confirmação',
      dimension: 'scouter',
      metrics: ['count_confirmadas', 'count_all'],
      chartType: 'line',
      sortBy: 'count_confirmadas',
      sortOrder: 'desc',
      limit: 10,
    },
    {
      id: 'widget-3',
      title: 'Distribuição por Status',
      dimension: 'ficha_confirmada',
      metrics: ['count_all'],
      chartType: 'pie',
    },
    {
      id: 'widget-4',
      title: 'Total de Leads',
      dimension: 'scouter',
      metrics: ['count_all'],
      chartType: 'kpi_card',
    },
  ]);

  // TODO: Implement widget edit functionality
  const handleEditWidget = (widget: DashboardWidget) => {
    // Future implementation: Open modal with widget configuration
    console.log('Edit widget:', widget);
  };

  const gridWidgets: GridWidget[] = widgets.map((widget, idx) => ({
    id: widget.id,
    title: widget.title,
    component: (
      <DynamicWidget 
        config={widget} 
        onEdit={handleEditWidget}
        onDelete={(id) => setWidgets(prev => prev.filter(w => w.id !== id))}
      />
    ),
    size: {
      cols: idx === 3 ? 12 : 6, // KPI card ocupa largura total
      rows: idx === 3 ? 2 : 4,
    },
  }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Avançado</h1>
          <p className="text-muted-foreground mt-1">
            Visualize dados com gráficos dinâmicos e personalizáveis
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Widget
        </Button>
      </div>

      {/* Tabs para diferentes visualizações */}
      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6 mt-6">
          {/* Grid de widgets */}
          <GridLayout widgets={gridWidgets} gap={6} />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance dos Scouters</CardTitle>
              <CardDescription>
                Métricas de desempenho e comparação entre equipes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Em desenvolvimento - Adicione widgets de performance aqui
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info card */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Sobre este Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-disc list-inside space-y-2">
            <li>Widgets dinâmicos baseados em queries configuráveis</li>
            <li>Gráficos ApexCharts com suporte a múltiplos tipos</li>
            <li>Layout responsivo com grid customizável</li>
            <li>Filtros por data, projeto, scouter e mais</li>
            <li>Exportação de dados em PDF e CSV</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Dashboard Manager - Página principal de gerenciamento de dashboards
 * Permite criar, editar, deletar e visualizar dashboards personalizados
 */

import { useState } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { DynamicWidget } from '@/components/dashboard/DynamicWidget';
import { QueryBuilder } from '@/components/dashboard/QueryBuilder';
import { DraggableGridLayout, DraggableWidget } from '@/components/dashboard/DraggableGridLayout';
import type { DashboardConfig, DashboardWidget } from '@/types/dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Save, Trash2, LayoutDashboard, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardManager() {
  const {
    dashboards,
    isLoading,
    createDashboard,
    updateDashboard,
    deleteDashboard,
    isCreating,
    isUpdating,
    isDeleting,
  } = useDashboard();

  const [selectedDashboard, setSelectedDashboard] = useState<DashboardConfig | null>(null);
  const [showQueryBuilder, setShowQueryBuilder] = useState(false);
  const [showNewDashboardDialog, setShowNewDashboardDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);
  
  // Estado para novo dashboard
  const [newDashboardName, setNewDashboardName] = useState('');
  const [newDashboardDescription, setNewDashboardDescription] = useState('');

  // Selecionar primeiro dashboard por padrão
  useState(() => {
    if (!selectedDashboard && dashboards.length > 0) {
      const defaultDashboard = dashboards.find(d => d.is_default) || dashboards[0];
      setSelectedDashboard(defaultDashboard);
    }
  });

  const handleCreateDashboard = () => {
    if (!newDashboardName.trim()) {
      toast.error('Nome do dashboard é obrigatório');
      return;
    }

    createDashboard({
      name: newDashboardName,
      description: newDashboardDescription,
      widgets: [],
      is_default: dashboards.length === 0, // Primeiro dashboard é default
    });

    setNewDashboardName('');
    setNewDashboardDescription('');
    setShowNewDashboardDialog(false);
  };

  const handleSaveWidget = (widgetConfig: Omit<DashboardWidget, 'id'>) => {
    if (!selectedDashboard) {
      toast.error('Nenhum dashboard selecionado');
      return;
    }

    let updatedWidgets: DashboardWidget[];

    if (editingWidget) {
      // Atualizar widget existente
      updatedWidgets = selectedDashboard.widgets.map(w =>
        w.id === editingWidget.id ? { ...widgetConfig, id: editingWidget.id } : w
      );
    } else {
      // Adicionar novo widget
      const newWidget: DashboardWidget = {
        ...widgetConfig,
        id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      updatedWidgets = [...selectedDashboard.widgets, newWidget];
    }

    updateDashboard({
      id: selectedDashboard.id,
      config: { widgets: updatedWidgets },
    });

    setShowQueryBuilder(false);
    setEditingWidget(null);
  };

  const handleEditWidget = (widget: DashboardWidget) => {
    setEditingWidget(widget);
    setShowQueryBuilder(true);
  };

  const handleDeleteWidget = (widgetId: string) => {
    if (!selectedDashboard) return;

    const updatedWidgets = selectedDashboard.widgets.filter(w => w.id !== widgetId);
    updateDashboard({
      id: selectedDashboard.id,
      config: { widgets: updatedWidgets },
    });
  };

  const handleReorderWidgets = (reorderedWidgets: DraggableWidget[]) => {
    if (!selectedDashboard) return;

    // Reconstruir widgets mantendo configurações originais
    const updatedWidgets = reorderedWidgets.map(dw => {
      const originalWidget = selectedDashboard.widgets.find(w => w.id === dw.id);
      return originalWidget!;
    });

    updateDashboard({
      id: selectedDashboard.id,
      config: { widgets: updatedWidgets },
    });
  };

  const handleDeleteDashboard = () => {
    if (!selectedDashboard) return;

    deleteDashboard(selectedDashboard.id);
    setSelectedDashboard(null);
    setShowDeleteDialog(false);
  };

  const draggableWidgets: DraggableWidget[] = selectedDashboard?.widgets.map((widget) => ({
    id: widget.id,
    title: widget.title,
    component: (
      <DynamicWidget
        config={widget}
        onEdit={handleEditWidget}
        onDelete={handleDeleteWidget}
      />
    ),
    size: {
      cols: widget.layout?.w || 6,
      rows: widget.layout?.h || 4,
    },
  })) || [];

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8" />
            Gerenciador de Dashboards
          </h1>
          <p className="text-muted-foreground mt-1">
            Crie e personalize seus dashboards com visualizações dinâmicas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowNewDashboardDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Dashboard
          </Button>
        </div>
      </div>

      {/* Dashboard Selector */}
      {dashboards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dashboard Ativo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="dashboard-select">Selecionar Dashboard</Label>
              <Select
                value={selectedDashboard?.id || ''}
                onValueChange={(id) => {
                  const dashboard = dashboards.find(d => d.id === id);
                  setSelectedDashboard(dashboard || null);
                }}
              >
                <SelectTrigger id="dashboard-select" className="mt-2">
                  <SelectValue placeholder="Selecione um dashboard" />
                </SelectTrigger>
                <SelectContent>
                  {dashboards.map((dashboard) => (
                    <SelectItem key={dashboard.id} value={dashboard.id}>
                      {dashboard.name}
                      {dashboard.is_default && ' (Padrão)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedDashboard && (
              <div className="flex gap-2 items-end">
                <Button
                  onClick={() => setShowQueryBuilder(true)}
                  disabled={isUpdating}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Widget
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Deletar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dashboard Content */}
      {selectedDashboard ? (
        <>
          {selectedDashboard.description && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <p className="text-sm">{selectedDashboard.description}</p>
              </CardContent>
            </Card>
          )}

          {draggableWidgets.length > 0 ? (
            <DraggableGridLayout 
              widgets={draggableWidgets} 
              onReorder={handleReorderWidgets}
              gap={6}
              editable={true}
            />
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <Settings className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum widget adicionado</h3>
                <p className="text-muted-foreground mb-4">
                  Comece adicionando widgets ao seu dashboard
                </p>
                <Button onClick={() => setShowQueryBuilder(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Primeiro Widget
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <LayoutDashboard className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum dashboard criado</h3>
            <p className="text-muted-foreground mb-4">
              Crie seu primeiro dashboard para começar
            </p>
            <Button onClick={() => setShowNewDashboardDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Dashboard
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Query Builder Dialog */}
      <Dialog open={showQueryBuilder} onOpenChange={setShowQueryBuilder}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingWidget ? 'Editar Widget' : 'Novo Widget'}
            </DialogTitle>
            <DialogDescription>
              Configure as dimensões, métricas e visualização do widget
            </DialogDescription>
          </DialogHeader>
          <QueryBuilder
            onSave={handleSaveWidget}
            onCancel={() => {
              setShowQueryBuilder(false);
              setEditingWidget(null);
            }}
            initialWidget={editingWidget || undefined}
          />
        </DialogContent>
      </Dialog>

      {/* New Dashboard Dialog */}
      <Dialog open={showNewDashboardDialog} onOpenChange={setShowNewDashboardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Dashboard</DialogTitle>
            <DialogDescription>
              Crie um novo dashboard personalizado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={newDashboardName}
                onChange={(e) => setNewDashboardName(e.target.value)}
                placeholder="Ex: Dashboard de Vendas"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={newDashboardDescription}
                onChange={(e) => setNewDashboardDescription(e.target.value)}
                placeholder="Ex: Métricas principais de vendas"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowNewDashboardDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateDashboard}
              disabled={isCreating || !newDashboardName.trim()}
            >
              <Save className="w-4 h-4 mr-2" />
              Criar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dashboard Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Dashboard</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o dashboard "{selectedDashboard?.name}"?
              Esta ação não pode ser desfeita e todos os widgets serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDashboard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

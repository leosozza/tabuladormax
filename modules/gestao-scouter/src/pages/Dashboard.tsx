/**
 * Unified Dashboard Page
 * Combines Performance Dashboard with Advanced Builder features
 * Supports drag-and-drop, custom widgets, and multiple chart types
 */

import { useState, useCallback, useMemo } from 'react';
import { AppShell } from '@/layouts/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { PerformanceDashboard } from '@/components/dashboard/PerformanceDashboard';
import { Button } from '@/components/ui/button';
import { Plus, Save, Download, Upload, LayoutDashboard, Settings, Trash2, Copy, RefreshCw, TrendingUp } from 'lucide-react';
import { DynamicWidget } from '@/components/dashboard/DynamicWidget';
import { WidgetConfigModal } from '@/components/dashboard/WidgetConfigModal';
import { useDashboardConfig } from '@/hooks/useDashboardConfig';
import type { DashboardWidget, DashboardConfig } from '@/types/dashboard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import '../pages/styles/grid-layout.css';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'performance' | 'builder'>('performance');
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [currentDashboardId, setCurrentDashboardId] = useState<string | null>(null);
  const [dashboardName, setDashboardName] = useState('Dashboard Customizado');
  const [dashboardDescription, setDashboardDescription] = useState('');
  const [widgetModalOpen, setWidgetModalOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | undefined>();
  const [isEditMode, setIsEditMode] = useState(true);
  
  const { toast } = useToast();
  
  const {
    configs,
    defaultConfig,
    isLoading,
    saveDashboard,
    updateDashboard,
    deleteDashboard
  } = useDashboardConfig();
  
  // Grid layout configuration
  const cols = 12;
  const rowHeight = 100;
  
  const layout = useMemo(() => {
    return widgets.map((widget, index) => ({
      i: widget.id,
      x: widget.layout?.x ?? (index % 3) * 4,
      y: widget.layout?.y ?? Math.floor(index / 3) * 3,
      w: widget.layout?.w ?? 4,
      h: widget.layout?.h ?? 3,
      minW: widget.layout?.minW ?? 2,
      minH: widget.layout?.minH ?? 2,
    }));
  }, [widgets]);

  const handleLayoutChange = useCallback((newLayout: any[]) => {
    if (!isEditMode) return;
    
    setWidgets(prevWidgets => 
      prevWidgets.map(widget => {
        const layoutItem = newLayout.find(l => l.i === widget.id);
        if (layoutItem) {
          return {
            ...widget,
            layout: {
              x: layoutItem.x,
              y: layoutItem.y,
              w: layoutItem.w,
              h: layoutItem.h,
              minW: widget.layout?.minW,
              minH: widget.layout?.minH,
            }
          };
        }
        return widget;
      })
    );
  }, [isEditMode]);
  
  const handleAddWidget = (widget: DashboardWidget) => {
    if (editingWidget) {
      // Update existing widget
      setWidgets(widgets.map(w => w.id === widget.id ? widget : w));
      setEditingWidget(undefined);
    } else {
      // Add new widget with default layout
      const newWidget = {
        ...widget,
        layout: {
          x: 0,
          y: Infinity, // Place at bottom
          w: 4,
          h: 3,
          minW: 2,
          minH: 2,
        }
      };
      setWidgets([...widgets, newWidget]);
    }
  };
  
  const handleEditWidget = (widget: DashboardWidget) => {
    setEditingWidget(widget);
    setWidgetModalOpen(true);
  };
  
  const handleDeleteWidget = (widgetId: string) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
    toast({
      title: 'Widget removido',
      description: 'O painel foi removido do dashboard.'
    });
  };
  
  const handleDuplicateWidget = (widget: DashboardWidget) => {
    const duplicatedWidget: DashboardWidget = {
      ...widget,
      id: `widget-${Date.now()}`,
      title: `${widget.title} (cópia)`,
      layout: {
        ...widget.layout,
        x: 0,
        y: Infinity,
      }
    };
    setWidgets([...widgets, duplicatedWidget]);
    toast({
      title: 'Widget duplicado',
      description: 'Uma cópia do painel foi criada.'
    });
  };
  
  const handleSaveDashboard = () => {
    const config: Omit<DashboardConfig, 'id' | 'created_at' | 'updated_at'> = {
      name: dashboardName,
      description: dashboardDescription,
      widgets,
      is_default: false,
      layout: {
        cols,
        rowHeight,
        compactType: 'vertical'
      }
    };
    
    if (currentDashboardId) {
      updateDashboard.mutate({ ...config, id: currentDashboardId });
    } else {
      saveDashboard.mutate(config);
    }
    
    setSaveModalOpen(false);
  };
  
  const handleLoadDashboard = (configId: string) => {
    const config = configs.find(c => c.id === configId);
    if (config) {
      setWidgets(config.widgets);
      setDashboardName(config.name);
      setDashboardDescription(config.description || '');
      setCurrentDashboardId(config.id);
      toast({
        title: 'Dashboard carregado',
        description: `Dashboard "${config.name}" carregado com sucesso.`
      });
    }
  };
  
  const handleNewDashboard = () => {
    setWidgets([]);
    setDashboardName('Novo Dashboard');
    setDashboardDescription('');
    setCurrentDashboardId(null);
    toast({
      title: 'Novo dashboard',
      description: 'Comece adicionando widgets ao seu dashboard.'
    });
  };
  
  const handleExportDashboard = () => {
    const exportData = {
      name: dashboardName,
      description: dashboardDescription,
      widgets,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-${dashboardName.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Dashboard exportado',
      description: 'Configuração exportada com sucesso.'
    });
  };
  
  const handleImportDashboard = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        setWidgets(imported.widgets || []);
        setDashboardName(imported.name || 'Dashboard Importado');
        setDashboardDescription(imported.description || '');
        setCurrentDashboardId(null);
        
        toast({
          title: 'Dashboard importado',
          description: 'Configuração importada com sucesso.'
        });
      } catch (error) {
        toast({
          title: 'Erro ao importar',
          description: 'Arquivo de configuração inválido.',
          variant: 'destructive'
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <AppShell sidebar={<Sidebar />}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Análise de performance e criação de painéis personalizados
            </p>
          </div>
        </div>

        {/* Tabs for switching between Performance and Builder */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'performance' | 'builder')}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Análise de Performance
            </TabsTrigger>
            <TabsTrigger value="builder" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard Customizado
            </TabsTrigger>
          </TabsList>

          {/* Performance Dashboard Tab */}
          <TabsContent value="performance" className="space-y-4">
            <PerformanceDashboard />
          </TabsContent>

          {/* Custom Dashboard Builder Tab */}
          <TabsContent value="builder" className="space-y-6">
            <div className="p-6 space-y-6 bg-background rounded-lg border">
              {/* Builder Header */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {/* Load Dashboard */}
                  <Select value={currentDashboardId || ''} onValueChange={handleLoadDashboard}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Carregar dashboard salvo" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoading ? (
                        <div className="p-2">
                          <Skeleton className="h-8 w-full" />
                        </div>
                      ) : configs.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          Nenhum dashboard salvo
                        </div>
                      ) : (
                        configs.map(config => (
                          <SelectItem key={config.id} value={config.id}>
                            {config.name} {config.is_default && '(Padrão)'}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <Settings className="mr-2 h-4 w-4" />
                        Opções
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleNewDashboard}>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSaveModalOpen(true)}>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleExportDashboard}>
                        <Download className="mr-2 h-4 w-4" />
                        Exportar Configuração
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <label className="cursor-pointer">
                          <Upload className="mr-2 h-4 w-4" />
                          Importar Configuração
                          <input
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={handleImportDashboard}
                          />
                        </label>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={isEditMode ? 'bg-primary/10' : ''}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {isEditMode ? 'Desabilitar Edição' : 'Habilitar Edição'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <Button onClick={() => setWidgetModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Widget
                </Button>
              </div>
              
              {/* Dashboard Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{dashboardName}</CardTitle>
                      {dashboardDescription && (
                        <CardDescription>{dashboardDescription}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={isEditMode ? 'default' : 'secondary'}>
                        {isEditMode ? 'Modo Edição' : 'Modo Visualização'}
                      </Badge>
                      <Badge variant="outline">
                        {widgets.length} {widgets.length === 1 ? 'Widget' : 'Widgets'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </Card>
              
              {/* Grid de Widgets com Drag & Drop */}
              {widgets.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <LayoutDashboard className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Nenhum widget criado</h3>
                    <p className="text-muted-foreground mb-4 text-center max-w-md">
                      Comece adicionando seu primeiro widget. Escolha entre diversos tipos de gráficos 
                      e personalize cores, legendas e métricas.
                    </p>
                    <Button onClick={() => setWidgetModalOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Criar Primeiro Widget
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="relative">
                  {isEditMode && (
                    <Alert className="mb-4">
                      <AlertDescription>
                        💡 <strong>Dica:</strong> Arraste os widgets para reposicionar. 
                        Redimensione pelos cantos. Use o menu de contexto (três pontos) para duplicar ou excluir.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <GridLayout
                    className="layout"
                    layout={layout}
                    cols={cols}
                    rowHeight={rowHeight}
                    width={1200}
                    onLayoutChange={handleLayoutChange}
                    isDraggable={isEditMode}
                    isResizable={isEditMode}
                    compactType="vertical"
                    preventCollision={false}
                    margin={[16, 16]}
                  >
                    {widgets.map(widget => (
                      <div key={widget.id} className="grid-item">
                        <div className="h-full relative group">
                          {isEditMode && (
                            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleDuplicateWidget(widget)}
                                className="h-7 w-7 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleDeleteWidget(widget.id)}
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          <DynamicWidget
                            config={widget}
                            onEdit={isEditMode ? handleEditWidget : undefined}
                            onDelete={isEditMode ? handleDeleteWidget : undefined}
                          />
                        </div>
                      </div>
                    ))}
                  </GridLayout>
                </div>
              )}
              
              {/* Widget Config Modal */}
              <WidgetConfigModal
                open={widgetModalOpen}
                onOpenChange={(open) => {
                  setWidgetModalOpen(open);
                  if (!open) setEditingWidget(undefined);
                }}
                onSave={handleAddWidget}
                initialWidget={editingWidget}
              />
              
              {/* Save Dashboard Modal */}
              <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Salvar Dashboard</DialogTitle>
                    <DialogDescription>
                      Dê um nome e descrição para seu dashboard
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Dashboard</Label>
                      <Input
                        id="name"
                        value={dashboardName}
                        onChange={(e) => setDashboardName(e.target.value)}
                        placeholder="Ex: Análise de Performance"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição (opcional)</Label>
                      <Textarea
                        id="description"
                        value={dashboardDescription}
                        onChange={(e) => setDashboardDescription(e.target.value)}
                        placeholder="Descreva o objetivo deste dashboard..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSaveModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveDashboard}>
                      Salvar Dashboard
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
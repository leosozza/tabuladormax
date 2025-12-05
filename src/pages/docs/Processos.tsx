import { useState, useMemo } from 'react';
import { Plus, Search, Filter, GitBranch, Boxes, Users, Link, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProcessDiagrams } from '@/hooks/useProcessDiagrams';
import { useUserRole } from '@/hooks/useUserRole';
import { BpmnEditor } from '@/components/bpmn/BpmnEditor';
import { ProcessCard } from '@/components/bpmn/ProcessCard';
import { ProcessDiagram, BpmnCategory, categoryConfig } from '@/types/bpmn';
import { moduleConfig } from '@/types/roadmap';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Node, Edge } from 'reactflow';

export default function Processos() {
  const { diagrams, isLoading, createDiagram, updateDiagram, deleteDiagram } = useProcessDiagrams();
  const { isAdmin, isManager } = useUserRole();
  const canManage = isAdmin || isManager;

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingDiagram, setEditingDiagram] = useState<ProcessDiagram | null>(null);
  const [viewingDiagram, setViewingDiagram] = useState<ProcessDiagram | null>(null);
  const [deletingDiagram, setDeletingDiagram] = useState<ProcessDiagram | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'processo' as BpmnCategory,
    module: '',
  });

  const filteredDiagrams = useMemo(() => {
    if (!diagrams) return [];
    return diagrams.filter((d) => {
      const matchesSearch = !search || 
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.description?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || d.category === selectedCategory;
      const matchesModule = selectedModule === 'all' || d.module === selectedModule;
      return matchesSearch && matchesCategory && matchesModule;
    });
  }, [diagrams, search, selectedCategory, selectedModule]);

  const handleCreate = async () => {
    await createDiagram.mutateAsync({
      name: formData.name,
      description: formData.description,
      category: formData.category,
      module: formData.module || undefined,
      is_published: true,
    });
    setCreateDialogOpen(false);
    setFormData({ name: '', description: '', category: 'processo', module: '' });
  };

  const handleSaveDiagram = async (nodes: Node[], edges: Edge[]) => {
    if (!editingDiagram) return;
    await updateDiagram.mutateAsync({
      id: editingDiagram.id,
      diagram_data: JSON.parse(JSON.stringify({ nodes, edges })),
    });
  };

  const handleConfirmDelete = async () => {
    if (!deletingDiagram) return;
    await deleteDiagram.mutateAsync(deletingDiagram.id);
    setDeletingDiagram(null);
  };

  const openEdit = (diagram: ProcessDiagram) => {
    setEditingDiagram(diagram);
  };

  if (viewingDiagram) {
    return (
      <div className="h-screen flex flex-col">
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setViewingDiagram(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{viewingDiagram.name}</h1>
              <p className="text-sm text-muted-foreground">{viewingDiagram.description}</p>
            </div>
          </div>
          {canManage && (
            <Button onClick={() => { setViewingDiagram(null); openEdit(viewingDiagram); }}>
              Editar Diagrama
            </Button>
          )}
        </div>
        <div className="flex-1">
          <BpmnEditor
            initialNodes={viewingDiagram.diagram_data?.nodes || []}
            initialEdges={viewingDiagram.diagram_data?.edges || []}
            readOnly
          />
        </div>
      </div>
    );
  }

  if (editingDiagram) {
    return (
      <div className="h-screen flex flex-col">
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setEditingDiagram(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Editando: {editingDiagram.name}</h1>
              <p className="text-sm text-muted-foreground">{editingDiagram.description}</p>
            </div>
          </div>
        </div>
        <div className="flex-1">
          <BpmnEditor
            initialNodes={editingDiagram.diagram_data?.nodes || []}
            initialEdges={editingDiagram.diagram_data?.edges || []}
            onSave={handleSaveDiagram}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <GitBranch className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Documentação de Processos</h1>
              <p className="text-muted-foreground">Diagramas BPMN do sistema</p>
            </div>
          </div>
          {canManage && (
            <Button size="icon" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar diagramas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Categorias</SelectItem>
              {Object.entries(categoryConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedModule} onValueChange={setSelectedModule}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Módulo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Módulos</SelectItem>
              {Object.entries(moduleConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Object.entries(categoryConfig).map(([key, config]) => {
            const count = diagrams?.filter(d => d.category === key).length || 0;
            const Icon = key === 'processo' ? GitBranch : key === 'arquitetura' ? Boxes : key === 'fluxo-usuario' ? Users : Link;
            return (
              <div 
                key={key}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${selectedCategory === key ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                onClick={() => setSelectedCategory(selectedCategory === key ? 'all' : key)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm text-muted-foreground">{config.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Diagrams Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando diagramas...</div>
        ) : filteredDiagrams.length === 0 ? (
          <div className="text-center py-12">
            <GitBranch className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum diagrama encontrado</p>
            {canManage && (
              <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Diagrama
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDiagrams.map((diagram) => (
              <ProcessCard
                key={diagram.id}
                diagram={diagram}
                onView={setViewingDiagram}
                onEdit={openEdit}
                onDelete={setDeletingDiagram}
                canManage={canManage}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Diagrama de Processo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do diagrama"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do processo"
              />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as BpmnCategory })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Módulo (opcional)</Label>
              <Select value={formData.module} onValueChange={(v) => setFormData({ ...formData, module: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um módulo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(moduleConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!formData.name || createDiagram.isPending}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingDiagram} onOpenChange={() => setDeletingDiagram(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir diagrama?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O diagrama "{deletingDiagram?.name}" será permanentemente excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

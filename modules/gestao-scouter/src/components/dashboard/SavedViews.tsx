
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BookmarkPlus, Bookmark, Trash2, Eye } from "lucide-react";
import { DashboardFilters } from "./FilterPanel";
import { useToast } from "@/hooks/use-toast";

interface SavedView {
  id: string;
  name: string;
  filters: DashboardFilters;
  createdAt: string;
}

interface SavedViewsProps {
  currentFilters: DashboardFilters;
  onLoadView: (filters: DashboardFilters) => void;
}

export const SavedViews = ({ currentFilters, onLoadView }: SavedViewsProps) => {
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadSavedViews();
  }, []);

  const loadSavedViews = () => {
    try {
      const saved = localStorage.getItem('maxfama_saved_views');
      if (saved) {
        setSavedViews(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Erro ao carregar visões salvas:', error);
    }
  };

  const saveCurrentView = () => {
    if (!viewName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para a visão",
        variant: "destructive"
      });
      return;
    }

    const newView: SavedView = {
      id: Date.now().toString(),
      name: viewName.trim(),
      filters: currentFilters,
      createdAt: new Date().toISOString()
    };

    const updatedViews = [...savedViews, newView];
    setSavedViews(updatedViews);
    localStorage.setItem('maxfama_saved_views', JSON.stringify(updatedViews));

    toast({
      title: "Visão salva",
      description: `"${viewName}" foi salva com sucesso`
    });

    setViewName("");
    setIsDialogOpen(false);
  };

  const loadView = (view: SavedView) => {
    onLoadView(view.filters);
    toast({
      title: "Visão carregada",
      description: `Filtros de "${view.name}" aplicados`
    });
  };

  const deleteView = (viewId: string) => {
    const updatedViews = savedViews.filter(v => v.id !== viewId);
    setSavedViews(updatedViews);
    localStorage.setItem('maxfama_saved_views', JSON.stringify(updatedViews));

    toast({
      title: "Visão removida",
      description: "Visão salva foi removida"
    });
  };

  const getFiltersDescription = (filters: DashboardFilters) => {
    const parts = [];
    
    if (filters.scouters.length > 0) {
      parts.push(`${filters.scouters.length} scouter${filters.scouters.length > 1 ? 's' : ''}`);
    }
    
    if (filters.projects.length > 0) {
      parts.push(`${filters.projects.length} projeto${filters.projects.length > 1 ? 's' : ''}`);
    }

    const startDate = new Date(filters.dateRange.start).toLocaleDateString('pt-BR');
    const endDate = new Date(filters.dateRange.end).toLocaleDateString('pt-BR');
    parts.push(`${startDate} - ${endDate}`);

    return parts.join(' • ');
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-primary" />
            Visões Salvas
            {savedViews.length > 0 && (
              <Badge variant="outline">{savedViews.length}</Badge>
            )}
          </CardTitle>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <BookmarkPlus className="w-4 h-4" />
                Salvar Visão
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Salvar Visão Atual</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Nome da visão</label>
                  <Input
                    value={viewName}
                    onChange={(e) => setViewName(e.target.value)}
                    placeholder="Ex: Projeto ABC - Última semana"
                    className="mt-1"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  <strong>Filtros atuais:</strong>
                  <br />
                  {getFiltersDescription(currentFilters)}
                </div>
                <div className="flex gap-3 pt-4">
                  <Button onClick={saveCurrentView} className="flex-1">
                    Salvar
                  </Button>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      {savedViews.length > 0 && (
        <CardContent>
          <div className="space-y-3">
            {savedViews.map((view) => (
              <div key={view.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{view.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {getFiltersDescription(view.filters)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Salva em {new Date(view.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => loadView(view)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => deleteView(view.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

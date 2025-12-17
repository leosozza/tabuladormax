import { useState } from 'react';
import { Plus, Edit, Trash2, Sparkles, Power, PowerOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  useAllTelemarketingScripts, 
  useCreateScript, 
  useUpdateScript, 
  useDeleteScript,
  useAnalyzeScript,
  TelemarketingScript 
} from '@/hooks/useTelemarketingScripts';
import { cn } from '@/lib/utils';

interface ScriptManagerProps {
  projectId: string;
  userId?: string;
}

const CATEGORIES = [
  { value: 'abertura', label: 'Abertura' },
  { value: 'objecoes', label: 'Objeções' },
  { value: 'fechamento', label: 'Fechamento' },
  { value: 'geral', label: 'Geral' },
];

export function ScriptManager({ projectId, userId }: ScriptManagerProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<TelemarketingScript | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'geral',
    priority: 0
  });
  
  const { data: scripts, isLoading } = useAllTelemarketingScripts(projectId);
  const createScript = useCreateScript();
  const updateScript = useUpdateScript();
  const deleteScript = useDeleteScript();
  const analyzeScript = useAnalyzeScript();
  
  const resetForm = () => {
    setFormData({ title: '', content: '', category: 'geral', priority: 0 });
    setEditingScript(null);
  };
  
  const openEditDialog = (script: TelemarketingScript) => {
    setEditingScript(script);
    setFormData({
      title: script.title,
      content: script.content,
      category: script.category,
      priority: script.priority
    });
    setIsDialogOpen(true);
  };
  
  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({ title: 'Erro', description: 'Preencha título e conteúdo', variant: 'destructive' });
      return;
    }
    
    try {
      if (editingScript) {
        await updateScript.mutateAsync({
          id: editingScript.id,
          ...formData,
          updated_by: userId
        });
        toast({ title: 'Script atualizado com sucesso' });
      } else {
        await createScript.mutateAsync({
          ...formData,
          commercial_project_id: projectId,
          is_active: true,
          created_by: userId,
          updated_by: userId
        });
        toast({ title: 'Script criado com sucesso' });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving script:', error);
      toast({ title: 'Erro ao salvar script', variant: 'destructive' });
    }
  };
  
  const handleToggleActive = async (script: TelemarketingScript) => {
    try {
      await updateScript.mutateAsync({
        id: script.id,
        is_active: !script.is_active,
        updated_by: userId
      });
      toast({ 
        title: script.is_active ? 'Script desativado' : 'Script ativado'
      });
    } catch (error) {
      toast({ title: 'Erro ao atualizar script', variant: 'destructive' });
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este script?')) return;
    
    try {
      await deleteScript.mutateAsync(id);
      toast({ title: 'Script excluído com sucesso' });
    } catch (error) {
      toast({ title: 'Erro ao excluir script', variant: 'destructive' });
    }
  };
  
  const handleAnalyze = async (scriptId: string) => {
    try {
      toast({ title: 'Analisando script...', description: 'Aguarde a análise da IA' });
      await analyzeScript.mutateAsync(scriptId);
      toast({ title: 'Análise concluída!', description: 'Verifique a pontuação do script' });
    } catch (error) {
      console.error('Error analyzing script:', error);
      toast({ title: 'Erro ao analisar script', variant: 'destructive' });
    }
  };
  
  const getScoreColor = (score: number | null) => {
    if (!score) return 'bg-muted';
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find(c => c.value === value)?.label || value;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Gerenciar Scripts</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Script
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingScript ? 'Editar Script' : 'Criar Novo Script'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Abertura padrão"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Conteúdo do Script</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Digite o script aqui... Use {nome} para inserir o nome do lead"
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Prioridade (maior = aparece primeiro)</Label>
                <Input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                  min={0}
                  max={100}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createScript.isPending || updateScript.isPending}
              >
                {(createScript.isPending || updateScript.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingScript ? 'Salvar Alterações' : 'Criar Script'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !scripts?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum script criado ainda
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {scripts.map(script => (
                <div 
                  key={script.id} 
                  className={cn(
                    "border rounded-lg p-4 transition-opacity",
                    !script.is_active && "opacity-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium truncate">{script.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {getCategoryLabel(script.category)}
                        </Badge>
                        {script.ai_score !== null && (
                          <Badge className={cn("text-xs text-white", getScoreColor(script.ai_score))}>
                            <Sparkles className="w-3 h-3 mr-1" />
                            {script.ai_score}/100
                          </Badge>
                        )}
                        {!script.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            Inativo
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {script.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAnalyze(script.id)}
                        disabled={analyzeScript.isPending}
                        title="Analisar com IA"
                      >
                        {analyzeScript.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(script)}
                        title={script.is_active ? 'Desativar' : 'Ativar'}
                      >
                        {script.is_active ? (
                          <Power className="w-4 h-4 text-green-500" />
                        ) : (
                          <PowerOff className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(script)}
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(script.id)}
                        title="Excluir"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

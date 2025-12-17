import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Zap, Hash } from 'lucide-react';
import {
  useAllQuickTexts,
  useCreateQuickText,
  useUpdateQuickText,
  useDeleteQuickText,
  QUICK_TEXT_CATEGORIES,
  type QuickText,
} from '@/hooks/useTelemarketingQuickTexts';

interface QuickTextManagerProps {
  projectId: string;
  userId?: string;
}

export function QuickTextManager({ projectId, userId }: QuickTextManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuickText, setEditingQuickText] = useState<QuickText | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'geral',
    shortcut: '',
    priority: 0,
    is_active: true,
  });

  const { data: quickTexts = [], isLoading } = useAllQuickTexts(projectId);
  const createQuickText = useCreateQuickText();
  const updateQuickText = useUpdateQuickText();
  const deleteQuickText = useDeleteQuickText();

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'geral',
      shortcut: '',
      priority: 0,
      is_active: true,
    });
    setEditingQuickText(null);
  };

  const openEditDialog = (quickText: QuickText) => {
    setEditingQuickText(quickText);
    setFormData({
      title: quickText.title,
      content: quickText.content,
      category: quickText.category || 'geral',
      shortcut: quickText.shortcut || '',
      priority: quickText.priority,
      is_active: quickText.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) return;

    const payload = {
      title: formData.title.trim(),
      content: formData.content.trim(),
      category: formData.category,
      shortcut: formData.shortcut.trim() || null,
      priority: formData.priority,
      is_active: formData.is_active,
      commercial_project_id: projectId,
      created_by: userId || null,
    };

    if (editingQuickText) {
      await updateQuickText.mutateAsync({ id: editingQuickText.id, ...payload });
    } else {
      await createQuickText.mutateAsync(payload);
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este texto rápido?')) {
      await deleteQuickText.mutateAsync(id);
    }
  };

  const handleToggleActive = async (quickText: QuickText) => {
    await updateQuickText.mutateAsync({
      id: quickText.id,
      is_active: !quickText.is_active,
    });
  };

  const getCategoryInfo = (categoryValue: string) => {
    return QUICK_TEXT_CATEGORIES.find(c => c.value === categoryValue) || 
           { value: categoryValue, label: categoryValue, emoji: '📝' };
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Textos Rápidos
        </CardTitle>
        <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />
          Novo
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">
              Carregando...
            </div>
          ) : quickTexts.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum texto rápido cadastrado</p>
              <p className="text-sm">Clique em "Novo" para criar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {quickTexts.map((qt) => {
                const categoryInfo = getCategoryInfo(qt.category);
                return (
                  <div
                    key={qt.id}
                    className={`p-3 border rounded-lg ${qt.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-sm">{qt.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {categoryInfo.emoji} {categoryInfo.label}
                          </Badge>
                          {qt.shortcut && (
                            <Badge variant="secondary" className="text-xs">
                              {qt.shortcut}
                            </Badge>
                          )}
                          {!qt.is_active && (
                            <Badge variant="destructive" className="text-xs">
                              Inativo
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {qt.content}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {qt.usage_count} usos
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={qt.is_active}
                          onCheckedChange={() => handleToggleActive(qt)}
                          className="scale-75"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEditDialog(qt)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(qt.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingQuickText ? 'Editar Texto Rápido' : 'Novo Texto Rápido'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ex: Saudação inicial"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo *</Label>
              <Textarea
                id="content"
                placeholder="Digite o texto que será enviado..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUICK_TEXT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.emoji} {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortcut">Atalho</Label>
                <Input
                  id="shortcut"
                  placeholder="/oi"
                  value={formData.shortcut}
                  onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade (maior = aparece primeiro)</Label>
              <Input
                id="priority"
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.title.trim() || !formData.content.trim() || createQuickText.isPending || updateQuickText.isPending}
            >
              {editingQuickText ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

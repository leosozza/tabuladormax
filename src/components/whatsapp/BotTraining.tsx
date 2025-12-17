import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  BookOpen, 
  Plus, 
  Edit2, 
  Trash2, 
  Save,
  X,
  GraduationCap,
  Lightbulb,
  MessageCircle,
  Package,
  DollarSign,
  HelpCircle
} from 'lucide-react';
import { 
  useAITrainingInstructions, 
  useCreateInstruction, 
  useUpdateInstruction, 
  useDeleteInstruction,
  useToggleInstructionActive,
  type AITrainingInstruction 
} from '@/hooks/useAITraining';
import { toast } from 'sonner';

interface BotTrainingProps {
  projectId: string;
}

const TRAINING_CATEGORIES = [
  { value: 'saudacao', label: 'Saudação', icon: MessageCircle, color: 'text-green-500' },
  { value: 'produtos', label: 'Produtos/Serviços', icon: Package, color: 'text-blue-500' },
  { value: 'precos', label: 'Preços', icon: DollarSign, color: 'text-amber-500' },
  { value: 'objecoes', label: 'Objeções', icon: HelpCircle, color: 'text-red-500' },
  { value: 'qualificacao', label: 'Qualificação', icon: Lightbulb, color: 'text-purple-500' },
  { value: 'geral', label: 'Geral', icon: BookOpen, color: 'text-gray-500' },
];

export function BotTraining({ projectId }: BotTrainingProps) {
  const { data: instructions, isLoading } = useAITrainingInstructions();
  const createInstruction = useCreateInstruction();
  const updateInstruction = useUpdateInstruction();
  const deleteInstruction = useDeleteInstruction();
  const toggleActive = useToggleInstructionActive();

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'geral',
    priority: 0,
    is_active: true,
  });

  const projectInstructions = instructions?.filter(
    inst => inst.category && TRAINING_CATEGORIES.some(cat => cat.value === inst.category)
  ) || [];

  const handleEdit = (instruction: AITrainingInstruction) => {
    setEditingId(instruction.id);
    setFormData({
      title: instruction.title,
      content: instruction.content || '',
      category: instruction.category || 'geral',
      priority: instruction.priority || 0,
      is_active: instruction.is_active ?? true,
    });
    setIsEditing(true);
  };

  const handleNew = () => {
    setEditingId(null);
    setFormData({
      title: '',
      content: '',
      category: 'geral',
      priority: 0,
      is_active: true,
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Título e conteúdo são obrigatórios');
      return;
    }

    if (editingId) {
      updateInstruction.mutate({
        id: editingId,
        ...formData,
        type: 'text',
      });
    } else {
      createInstruction.mutate({
        ...formData,
        type: 'text',
      });
    }

    setIsEditing(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta instrução?')) {
      deleteInstruction.mutate(id);
    }
  };

  const handleToggle = (id: string, currentActive: boolean) => {
    toggleActive.mutate({ id, is_active: !currentActive });
  };

  const getCategoryInfo = (category: string) => {
    return TRAINING_CATEGORIES.find(cat => cat.value === category) || TRAINING_CATEGORIES[5];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <GraduationCap className="h-8 w-8 animate-pulse text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Formulário de Edição */}
      {isEditing && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {editingId ? 'Editar Instrução' : 'Nova Instrução'}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Como responder sobre preços"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAINING_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <span className="flex items-center gap-2">
                          <cat.icon className={`h-4 w-4 ${cat.color}`} />
                          {cat.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo / Instruções</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Descreva como o bot deve se comportar nesta situação...&#10;&#10;Exemplo:&#10;Quando o cliente perguntar sobre preços, responda de forma educada que os valores variam conforme o serviço escolhido e ofereça mais informações."
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Seja específico. Inclua exemplos de frases e respostas esperadas.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="space-y-1">
                  <Label htmlFor="priority">Prioridade</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                    className="w-20"
                    min={0}
                    max={100}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label>Ativo</Label>
                </div>
              </div>
              <Button onClick={handleSave} disabled={createInstruction.isPending || updateInstruction.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Instruções */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Treinamento do Bot</CardTitle>
                <CardDescription>
                  Instruções que ensinam o bot a responder
                </CardDescription>
              </div>
            </div>
            <Button onClick={handleNew} disabled={isEditing}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Instrução
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Categorias */}
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b">
            {TRAINING_CATEGORIES.map((cat) => {
              const count = projectInstructions.filter(i => i.category === cat.value).length;
              return (
                <Badge key={cat.value} variant="outline" className="gap-1">
                  <cat.icon className={`h-3 w-3 ${cat.color}`} />
                  {cat.label}
                  <span className="ml-1 text-muted-foreground">({count})</span>
                </Badge>
              );
            })}
          </div>

          <ScrollArea className="h-[400px]">
            {projectInstructions.length > 0 ? (
              <div className="space-y-3">
                {projectInstructions.map((instruction) => {
                  const catInfo = getCategoryInfo(instruction.category || 'geral');
                  return (
                    <div
                      key={instruction.id}
                      className={`p-4 rounded-lg border ${instruction.is_active ? 'bg-card' : 'bg-muted/30 opacity-60'}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <catInfo.icon className={`h-4 w-4 ${catInfo.color}`} />
                            <span className="font-medium">{instruction.title}</span>
                            {!instruction.is_active && (
                              <Badge variant="secondary" className="text-xs">Inativo</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {instruction.content}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>Prioridade: {instruction.priority}</span>
                            <span>Usos: {instruction.usage_count}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggle(instruction.id, instruction.is_active ?? true)}
                          >
                            <Switch checked={instruction.is_active ?? true} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(instruction)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(instruction.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma instrução de treinamento</p>
                <p className="text-sm mt-1">Adicione instruções para ensinar o bot</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

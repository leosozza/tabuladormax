import { useState } from 'react';
import { Plus, Edit, Trash2, Sparkles, Power, PowerOff, Loader2, Wand2, Rocket, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  useAllTelemarketingScripts, 
  useCreateScript, 
  useUpdateScript, 
  useDeleteScript,
  useAnalyzeScript,
  useGenerateScript,
  useImproveScript,
  TelemarketingScript 
} from '@/hooks/useTelemarketingScripts';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

const IMPROVEMENT_TECHNIQUES = [
  { id: 'spin_selling', label: 'SPIN Selling', description: 'Perguntas consultivas' },
  { id: 'objection_handling', label: 'Tratamento de Objeções', description: 'Respostas para objeções comuns' },
  { id: 'closing_techniques', label: 'Técnicas de Fechamento', description: 'Fechamento por alternativa e urgência' },
  { id: 'personalization', label: 'Personalização', description: 'Variáveis e adaptação ao cliente' },
  { id: 'conversational', label: 'Tom Conversacional', description: 'Linguagem natural e humana' },
  { id: 'persuasion', label: 'Técnicas de Persuasão', description: 'Gatilhos mentais e Cialdini' },
];

export function ScriptManager({ projectId, userId }: ScriptManagerProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isImproveDialogOpen, setIsImproveDialogOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<TelemarketingScript | null>(null);
  const [improvingScript, setImprovingScript] = useState<TelemarketingScript | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'geral',
    priority: 0
  });

  const [generateData, setGenerateData] = useState({
    category: 'abertura',
    productService: '',
    targetAudience: '',
    tone: 'Profissional e cordial'
  });

  const [selectedTechniques, setSelectedTechniques] = useState<string[]>(['spin_selling', 'objection_handling']);
  
  const { data: scripts, isLoading } = useAllTelemarketingScripts(projectId);
  const createScript = useCreateScript();
  const updateScript = useUpdateScript();
  const deleteScript = useDeleteScript();
  const analyzeScript = useAnalyzeScript();
  const generateScript = useGenerateScript();
  const improveScript = useImproveScript();
  
  const resetForm = () => {
    setFormData({ title: '', content: '', category: 'geral', priority: 0 });
    setEditingScript(null);
  };

  const resetGenerateForm = () => {
    setGenerateData({
      category: 'abertura',
      productService: '',
      targetAudience: '',
      tone: 'Profissional e cordial'
    });
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

  const openImproveDialog = (script: TelemarketingScript) => {
    setImprovingScript(script);
    setSelectedTechniques(['spin_selling', 'objection_handling']);
    setIsImproveDialogOpen(true);
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
      toast({ title: 'Erro ao salvar script', description: 'Verifique se você está autenticado', variant: 'destructive' });
    }
  };

  const handleGenerate = async () => {
    if (!generateData.productService.trim()) {
      toast({ title: 'Erro', description: 'Informe o produto/serviço', variant: 'destructive' });
      return;
    }

    try {
      toast({ title: 'Gerando script...', description: 'Aguarde enquanto a IA cria seu script' });
      
      const result = await generateScript.mutateAsync({
        ...generateData,
        projectId
      });

      // Open the edit dialog with the generated script
      setFormData({
        title: result.suggestedTitle,
        content: result.script,
        category: result.category,
        priority: 10
      });
      setIsGenerateDialogOpen(false);
      setIsDialogOpen(true);
      resetGenerateForm();

      toast({ title: 'Script gerado!', description: 'Revise e salve o script' });
    } catch (error: any) {
      console.error('Error generating script:', error);
      toast({ 
        title: 'Erro ao gerar script', 
        description: error.message || 'Tente novamente mais tarde',
        variant: 'destructive' 
      });
    }
  };

  const handleImprove = async () => {
    if (!improvingScript || selectedTechniques.length === 0) {
      toast({ title: 'Erro', description: 'Selecione ao menos uma técnica', variant: 'destructive' });
      return;
    }

    try {
      toast({ title: 'Melhorando script...', description: 'Aplicando técnicas de vendas' });
      
      const result = await improveScript.mutateAsync({
        scriptId: improvingScript.id,
        scriptContent: improvingScript.content,
        techniques: selectedTechniques,
        improvementType: 'strategic'
      });

      // Open the edit dialog with the improved script
      setFormData({
        title: `${improvingScript.title} (Melhorado)`,
        content: result.improvedScript,
        category: improvingScript.category,
        priority: improvingScript.priority + 1
      });
      setIsImproveDialogOpen(false);
      setImprovingScript(null);
      setIsDialogOpen(true);

      toast({ title: 'Script melhorado!', description: 'Revise e salve como novo script' });
    } catch (error: any) {
      console.error('Error improving script:', error);
      toast({ 
        title: 'Erro ao melhorar script', 
        description: error.message || 'Tente novamente mais tarde',
        variant: 'destructive' 
      });
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

  const toggleTechnique = (techniqueId: string) => {
    setSelectedTechniques(prev => 
      prev.includes(techniqueId) 
        ? prev.filter(t => t !== techniqueId)
        : [...prev, techniqueId]
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="text-lg">Gerenciar Scripts</CardTitle>
        <div className="flex items-center gap-2">
          {/* Generate with AI Button */}
          <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <Wand2 className="w-4 h-4" />
                Gerar com IA
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-primary" />
                  Gerar Script com IA
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Categoria do Script</Label>
                  <Select
                    value={generateData.category}
                    onValueChange={(value) => setGenerateData(prev => ({ ...prev, category: value }))}
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
                <div className="space-y-2">
                  <Label>Produto/Serviço *</Label>
                  <Input
                    value={generateData.productService}
                    onChange={(e) => setGenerateData(prev => ({ ...prev, productService: e.target.value }))}
                    placeholder="Ex: Plano de saúde, Consórcio, Seguro auto..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Público-Alvo</Label>
                  <Input
                    value={generateData.targetAudience}
                    onChange={(e) => setGenerateData(prev => ({ ...prev, targetAudience: e.target.value }))}
                    placeholder="Ex: Empresários, Famílias, Jovens profissionais..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tom do Script</Label>
                  <Select
                    value={generateData.tone}
                    onValueChange={(value) => setGenerateData(prev => ({ ...prev, tone: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Profissional e cordial">Profissional e cordial</SelectItem>
                      <SelectItem value="Informal e amigável">Informal e amigável</SelectItem>
                      <SelectItem value="Consultivo e técnico">Consultivo e técnico</SelectItem>
                      <SelectItem value="Persuasivo e direto">Persuasivo e direto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                  <p className="font-medium mb-1">✨ Técnicas aplicadas automaticamente:</p>
                  <p>SPIN Selling, BANT, Tratamento de Objeções, Técnicas de Fechamento</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleGenerate}
                  disabled={generateScript.isPending}
                  className="gap-2"
                >
                  {generateScript.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Gerar Script
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* New Script Button */}
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
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !scripts?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum script criado ainda</p>
            <p className="text-sm mt-2">Clique em "Gerar com IA" para criar seu primeiro script</p>
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
                        onClick={() => openImproveDialog(script)}
                        disabled={improveScript.isPending}
                        title="Melhorar com IA"
                      >
                        <Rocket className="w-4 h-4 text-primary" />
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

      {/* Improve Script Dialog */}
      <Dialog open={isImproveDialogOpen} onOpenChange={(open) => {
        setIsImproveDialogOpen(open);
        if (!open) setImprovingScript(null);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-primary" />
              Melhorar Script com IA
            </DialogTitle>
          </DialogHeader>
          {improvingScript && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium text-sm">{improvingScript.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{improvingScript.content}</p>
              </div>
              
              <div className="space-y-3">
                <Label>Selecione as técnicas para aplicar:</Label>
                <div className="space-y-2">
                  {IMPROVEMENT_TECHNIQUES.map(technique => (
                    <div
                      key={technique.id}
                      className={cn(
                        "flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedTechniques.includes(technique.id) 
                          ? "border-primary bg-primary/5" 
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => toggleTechnique(technique.id)}
                    >
                      <Checkbox
                        id={technique.id}
                        checked={selectedTechniques.includes(technique.id)}
                        onCheckedChange={() => toggleTechnique(technique.id)}
                      />
                      <div className="flex-1">
                        <label htmlFor={technique.id} className="font-medium text-sm cursor-pointer">
                          {technique.label}
                        </label>
                        <p className="text-xs text-muted-foreground">{technique.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImproveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImprove}
              disabled={improveScript.isPending || selectedTechniques.length === 0}
              className="gap-2"
            >
              {improveScript.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Rocket className="w-4 h-4" />
              )}
              Aplicar Melhorias
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

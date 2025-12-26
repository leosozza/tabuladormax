import { useState } from "react";
import { AdminPageLayout } from "@/components/layouts/AdminPageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Bot, 
  FileText, 
  Settings2, 
  Eye, 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  X, 
  Copy,
  ChevronUp,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { 
  useAgenciamentoConfig, 
  useUpdateAgenciamentoConfig, 
  useCreateAgenciamentoConfig, 
  useDeleteAgenciamentoConfig,
  useToggleAgenciamentoConfig,
  buildPromptFromConfig,
  type AgenciamentoConfig
} from "@/hooks/useAgenciamentoConfig";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: 'persona', label: 'Persona', color: 'bg-purple-500' },
  { value: 'fluxo', label: 'Fluxo', color: 'bg-blue-500' },
  { value: 'regras', label: 'Regras', color: 'bg-orange-500' },
  { value: 'pagamento', label: 'Pagamento', color: 'bg-green-500' },
  { value: 'geral', label: 'Geral', color: 'bg-gray-500' },
];

export default function AgenciamentoAssistantTraining() {
  const { data: configs, isLoading } = useAgenciamentoConfig();
  const updateConfig = useUpdateAgenciamentoConfig();
  const createConfig = useCreateAgenciamentoConfig();
  const deleteConfig = useDeleteAgenciamentoConfig();
  const toggleConfig = useToggleAgenciamentoConfig();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<AgenciamentoConfig>>({});

  const handleEdit = (config: AgenciamentoConfig) => {
    setEditingId(config.id);
    setFormData(config);
    setIsCreating(false);
  };

  const handleNew = () => {
    setIsCreating(true);
    setEditingId(null);
    setFormData({
      config_key: '',
      config_value: '',
      description: '',
      priority: 50,
      category: 'geral',
      is_active: true,
    });
  };

  const handleSave = async () => {
    if (!formData.config_key || !formData.config_value) {
      toast.error("Chave e valor são obrigatórios");
      return;
    }

    if (isCreating) {
      await createConfig.mutateAsync({
        config_key: formData.config_key!,
        config_value: formData.config_value!,
        description: formData.description || null,
        priority: formData.priority || 50,
        category: formData.category || 'geral',
        is_active: formData.is_active ?? true,
      });
    } else if (editingId) {
      await updateConfig.mutateAsync({
        id: editingId,
        ...formData,
      });
    }

    setEditingId(null);
    setIsCreating(false);
    setFormData({});
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({});
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta regra?")) {
      await deleteConfig.mutateAsync(id);
    }
  };

  const handleToggle = async (id: string, is_active: boolean) => {
    await toggleConfig.mutateAsync({ id, is_active });
  };

  const copyPrompt = () => {
    if (configs) {
      const fullPrompt = buildPromptFromConfig(configs);
      navigator.clipboard.writeText(fullPrompt);
      toast.success("Prompt copiado para a área de transferência!");
    }
  };

  const getCategoryBadge = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return (
      <Badge variant="outline" className={cn("text-xs", cat?.color, "text-white border-0")}>
        {cat?.label || category}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <AdminPageLayout
        title="Treinamento do Assistente"
        description="Configurações e regras do assistente de agenciamento"
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminPageLayout>
    );
  }

  const activeCount = configs?.filter(c => c.is_active).length || 0;
  const totalCount = configs?.length || 0;

  return (
    <AdminPageLayout
      title="Treinamento do Assistente de Agenciamento"
      description="Gerencie as regras e comportamentos do assistente de IA do portal do produtor"
    >
      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Regras ({activeCount}/{totalCount})
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2">
            <Eye className="h-4 w-4" />
            Preview do Prompt
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          {/* Formulário de edição/criação */}
          {(editingId || isCreating) && (
            <Card className="border-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {isCreating ? "Nova Regra" : "Editar Regra"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Chave (identificador único)</Label>
                    <Input
                      value={formData.config_key || ''}
                      onChange={(e) => setFormData({ ...formData, config_key: e.target.value })}
                      placeholder="ex: regra_boleto_parcelado"
                      disabled={!isCreating}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <Select
                        value={formData.category || 'geral'}
                        onValueChange={(v) => setFormData({ ...formData, category: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Prioridade (0-100)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={formData.priority || 50}
                        onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição (para referência)</Label>
                  <Input
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Breve descrição do que esta regra faz"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Conteúdo da Regra</Label>
                  <Textarea
                    value={formData.config_value || ''}
                    onChange={(e) => setFormData({ ...formData, config_value: e.target.value })}
                    placeholder="Conteúdo que será incluído no prompt do assistente"
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Regra ativa</Label>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={updateConfig.isPending || createConfig.isPending}>
                    {(updateConfig.isPending || createConfig.isPending) ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de regras */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {CATEGORIES.map((cat) => {
                const count = configs?.filter(c => c.category === cat.value).length || 0;
                if (count === 0) return null;
                return (
                  <Badge key={cat.value} variant="outline" className="text-xs">
                    {cat.label}: {count}
                  </Badge>
                );
              })}
            </div>
            <Button onClick={handleNew} disabled={isCreating || !!editingId}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Regra
            </Button>
          </div>

          <ScrollArea className="h-[600px]">
            <div className="space-y-3 pr-4">
              {configs?.map((config) => (
                <Card 
                  key={config.id} 
                  className={cn(
                    "transition-all",
                    !config.is_active && "opacity-60",
                    editingId === config.id && "ring-2 ring-primary"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {getCategoryBadge(config.category)}
                          <span className="font-medium text-sm">{config.config_key}</span>
                          <Badge variant="outline" className="text-xs">
                            P: {config.priority}
                          </Badge>
                          {config.is_active ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        
                        {config.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {config.description}
                          </p>
                        )}
                        
                        <pre className="text-xs bg-muted p-2 rounded max-h-32 overflow-auto whitespace-pre-wrap font-mono">
                          {config.config_value.substring(0, 300)}
                          {config.config_value.length > 300 && '...'}
                        </pre>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Switch
                          checked={config.is_active}
                          onCheckedChange={(checked) => handleToggle(config.id, checked)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(config)}
                          disabled={!!editingId || isCreating}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(config.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Preview do Prompt Completo</CardTitle>
                  <CardDescription>
                    Este é o prompt que será enviado para a IA (apenas regras ativas, ordenado por prioridade)
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={copyPrompt}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-4 rounded-lg">
                  {configs ? buildPromptFromConfig(configs) : 'Carregando...'}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminPageLayout>
  );
}

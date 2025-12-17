import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, Trash2, Settings, Webhook, Database, Workflow, 
  MessageSquare, UserCheck, Edit, Check, X, Zap, Copy
} from 'lucide-react';
import { 
  useAgentTools, 
  useCreateAgentTool, 
  useUpdateAgentTool, 
  useDeleteAgentTool,
  TOOL_TEMPLATES,
  BITRIX_API_METHODS,
  type AgentTool 
} from '@/hooks/useAIProviders';
import { toast } from 'sonner';

interface BotToolsManagerProps {
  projectId: string;
  availableTools: string[];
  onAvailableToolsChange: (tools: string[]) => void;
}

const TOOL_TYPE_CONFIG: Record<string, { icon: typeof Webhook; label: string; color: string }> = {
  webhook: { icon: Webhook, label: 'Webhook', color: 'bg-blue-500' },
  bitrix_update: { icon: Database, label: 'Bitrix Update', color: 'bg-orange-500' },
  bitrix_get: { icon: Database, label: 'Bitrix Get', color: 'bg-orange-500' },
  bitrix_api: { icon: Database, label: 'Bitrix API', color: 'bg-amber-500' },
  supabase_query: { icon: Database, label: 'Supabase', color: 'bg-green-500' },
  n8n_workflow: { icon: Workflow, label: 'n8n', color: 'bg-purple-500' },
  send_template: { icon: MessageSquare, label: 'Template', color: 'bg-cyan-500' },
  transfer_human: { icon: UserCheck, label: 'Transferir', color: 'bg-red-500' },
};

export function BotToolsManager({ projectId, availableTools, onAvailableToolsChange }: BotToolsManagerProps) {
  const { data: tools, isLoading } = useAgentTools(projectId);
  const createTool = useCreateAgentTool();
  const updateTool = useUpdateAgentTool();
  const deleteTool = useDeleteAgentTool();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<AgentTool | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    tool_type: 'webhook' as AgentTool['tool_type'],
    config: {} as Record<string, unknown>,
    parameters_schema: { type: 'object', properties: {}, required: [] } as Record<string, unknown>,
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      display_name: '',
      description: '',
      tool_type: 'webhook',
      config: {},
      parameters_schema: { type: 'object', properties: {}, required: [] },
      is_active: true,
    });
    setEditingTool(null);
  };

  const handleCreateFromTemplate = (template: typeof TOOL_TEMPLATES[0]) => {
    setFormData({
      name: template.name,
      display_name: template.display_name,
      description: template.description,
      tool_type: template.tool_type,
      config: template.config,
      parameters_schema: template.parameters_schema,
      is_active: true,
    });
    setIsCreateOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.display_name || !formData.description) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (editingTool) {
        await updateTool.mutateAsync({
          id: editingTool.id,
          ...formData,
        });
      } else {
        await createTool.mutateAsync({
          ...formData,
          commercial_project_id: projectId,
        });
      }
      setIsCreateOpen(false);
      resetForm();
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleDelete = async (tool: AgentTool) => {
    if (confirm(`Remover ferramenta "${tool.display_name}"?`)) {
      await deleteTool.mutateAsync({ id: tool.id, projectId });
      // Remover da lista de disponíveis
      onAvailableToolsChange(availableTools.filter(id => id !== tool.id));
    }
  };

  const handleEdit = (tool: AgentTool) => {
    setEditingTool(tool);
    setFormData({
      name: tool.name,
      display_name: tool.display_name,
      description: tool.description,
      tool_type: tool.tool_type,
      config: tool.config,
      parameters_schema: tool.parameters_schema,
      is_active: tool.is_active,
    });
    setIsCreateOpen(true);
  };

  const toggleToolAvailability = (toolId: string) => {
    if (availableTools.includes(toolId)) {
      onAvailableToolsChange(availableTools.filter(id => id !== toolId));
    } else {
      onAvailableToolsChange([...availableTools, toolId]);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Zap className="h-6 w-6 animate-pulse text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Templates de Ferramentas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Templates Rápidos
          </CardTitle>
          <CardDescription>
            Clique para criar uma ferramenta a partir de um template
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {TOOL_TEMPLATES.map((template) => {
              const TypeIcon = TOOL_TYPE_CONFIG[template.tool_type]?.icon || Settings;
              return (
                <Button
                  key={template.name}
                  variant="outline"
                  className="justify-start h-auto py-3 px-4"
                  onClick={() => handleCreateFromTemplate(template)}
                >
                  <TypeIcon className="h-4 w-4 mr-2 shrink-0" />
                  <div className="text-left">
                    <div className="font-medium text-sm">{template.display_name}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {template.description}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Ferramentas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Ferramentas do Agente
              </CardTitle>
              <CardDescription>
                Ações que o bot pode executar automaticamente
              </CardDescription>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={(open) => {
              setIsCreateOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Ferramenta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>
                    {editingTool ? 'Editar Ferramenta' : 'Nova Ferramenta'}
                  </DialogTitle>
                  <DialogDescription>
                    Configure uma ação que o bot pode executar
                  </DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4 py-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Nome (identificador)</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')
                          }))}
                          placeholder="ex: update_status"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nome de Exibição</Label>
                        <Input
                          value={formData.display_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                          placeholder="ex: Atualizar Status"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Descrição (para a IA)</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Descreva quando e como a IA deve usar esta ferramenta"
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo de Ferramenta</Label>
                      <Select 
                        value={formData.tool_type} 
                        onValueChange={(value) => setFormData(prev => ({ 
                          ...prev, 
                          tool_type: value as AgentTool['tool_type'],
                          config: {},
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bitrix_api">🔥 Bitrix API (Novo)</SelectItem>
                          <SelectItem value="webhook">Webhook Externo</SelectItem>
                          <SelectItem value="bitrix_update">Atualizar Bitrix (Legado)</SelectItem>
                          <SelectItem value="bitrix_get">Buscar do Bitrix (Legado)</SelectItem>
                          <SelectItem value="supabase_query">Consulta Supabase</SelectItem>
                          <SelectItem value="n8n_workflow">Workflow n8n</SelectItem>
                          <SelectItem value="transfer_human">Transferir para Humano</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Configuração específica por tipo */}
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="config">
                        <AccordionTrigger>Configuração Avançada</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            {(formData.tool_type === 'webhook' || formData.tool_type === 'n8n_workflow') && (
                              <>
                                <div className="space-y-2">
                                  <Label>URL do Webhook</Label>
                                  <Input
                                    value={(formData.config.url as string) || (formData.config.webhook_url as string) || ''}
                                    onChange={(e) => setFormData(prev => ({
                                      ...prev,
                                      config: { 
                                        ...prev.config, 
                                        [formData.tool_type === 'n8n_workflow' ? 'webhook_url' : 'url']: e.target.value 
                                      },
                                    }))}
                                    placeholder="https://..."
                                  />
                                </div>
                                {formData.tool_type === 'webhook' && (
                                  <div className="space-y-2">
                                    <Label>Método HTTP</Label>
                                    <Select
                                      value={(formData.config.method as string) || 'POST'}
                                      onValueChange={(value) => setFormData(prev => ({
                                        ...prev,
                                        config: { ...prev.config, method: value },
                                      }))}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="GET">GET</SelectItem>
                                        <SelectItem value="POST">POST</SelectItem>
                                        <SelectItem value="PUT">PUT</SelectItem>
                                        <SelectItem value="PATCH">PATCH</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </>
                            )}

                            {formData.tool_type === 'bitrix_api' && (
                              <>
                                <div className="space-y-2">
                                  <Label>Método da API Bitrix</Label>
                                  <Select
                                    value={(formData.config.method as string) || ''}
                                    onValueChange={(value) => setFormData(prev => ({
                                      ...prev,
                                      config: { ...prev.config, method: value },
                                    }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione um método" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(
                                        BITRIX_API_METHODS.reduce((acc, m) => {
                                          if (!acc[m.category]) acc[m.category] = [];
                                          acc[m.category].push(m);
                                          return acc;
                                        }, {} as Record<string, typeof BITRIX_API_METHODS>)
                                      ).map(([category, methods]) => (
                                        <div key={category}>
                                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted">
                                            {category}
                                          </div>
                                          {methods.map((m) => (
                                            <SelectItem key={m.value} value={m.value}>
                                              {m.label}
                                            </SelectItem>
                                          ))}
                                        </div>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>URL Base do Bitrix (opcional)</Label>
                                  <Input
                                    value={(formData.config.base_url as string) || ''}
                                    onChange={(e) => setFormData(prev => ({
                                      ...prev,
                                      config: { ...prev.config, base_url: e.target.value },
                                    }))}
                                    placeholder="https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr"
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Deixe vazio para usar URL padrão do sistema
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <Label>Parâmetros Fixos (JSON)</Label>
                                  <Textarea
                                    value={JSON.stringify(formData.config.params || {}, null, 2)}
                                    onChange={(e) => {
                                      try {
                                        const parsed = JSON.parse(e.target.value);
                                        setFormData(prev => ({
                                          ...prev,
                                          config: { ...prev.config, params: parsed },
                                        }));
                                      } catch {
                                        // Ignorar JSON inválido durante digitação
                                      }
                                    }}
                                    rows={3}
                                    className="font-mono text-xs"
                                    placeholder='{"type": "user", "ownerId": 1}'
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Parâmetros que sempre serão enviados. Ex: tipo, ID do responsável
                                  </p>
                                </div>
                              </>
                            )}

                            {(formData.tool_type === 'bitrix_update' || formData.tool_type === 'bitrix_get') && (
                              <>
                                <div className="space-y-2">
                                  <Label>URL do Webhook Bitrix</Label>
                                  <Input
                                    value={(formData.config.webhook_url as string) || ''}
                                    onChange={(e) => setFormData(prev => ({
                                      ...prev,
                                      config: { ...prev.config, webhook_url: e.target.value },
                                    }))}
                                    placeholder="https://seu-bitrix.bitrix24.com.br/rest/..."
                                  />
                                </div>
                                {formData.tool_type === 'bitrix_update' && (
                                  <div className="space-y-2">
                                    <Label>Campo a Atualizar</Label>
                                    <Input
                                      value={(formData.config.field as string) || ''}
                                      onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        config: { ...prev.config, field: e.target.value },
                                      }))}
                                      placeholder="ex: STATUS_ID"
                                    />
                                  </div>
                                )}
                              </>
                            )}

                            {formData.tool_type === 'supabase_query' && (
                              <>
                                <div className="space-y-2">
                                  <Label>Tabela</Label>
                                  <Input
                                    value={(formData.config.table as string) || ''}
                                    onChange={(e) => setFormData(prev => ({
                                      ...prev,
                                      config: { ...prev.config, table: e.target.value },
                                    }))}
                                    placeholder="ex: products"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Operação</Label>
                                  <Select
                                    value={(formData.config.operation as string) || 'select'}
                                    onValueChange={(value) => setFormData(prev => ({
                                      ...prev,
                                      config: { ...prev.config, operation: value },
                                    }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="select">SELECT (buscar)</SelectItem>
                                      <SelectItem value="insert">INSERT (criar)</SelectItem>
                                      <SelectItem value="update">UPDATE (atualizar)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </>
                            )}

                            <div className="space-y-2">
                              <Label>Schema de Parâmetros (JSON)</Label>
                              <Textarea
                                value={JSON.stringify(formData.parameters_schema, null, 2)}
                                onChange={(e) => {
                                  try {
                                    const parsed = JSON.parse(e.target.value);
                                    setFormData(prev => ({ ...prev, parameters_schema: parsed }));
                                  } catch {
                                    // Ignorar JSON inválido durante digitação
                                  }
                                }}
                                rows={6}
                                className="font-mono text-xs"
                              />
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Ferramenta Ativa</Label>
                        <p className="text-xs text-muted-foreground">Desative para pausar sem excluir</p>
                      </div>
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                      />
                    </div>
                  </div>
                </ScrollArea>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={createTool.isPending || updateTool.isPending}>
                    {editingTool ? 'Salvar Alterações' : 'Criar Ferramenta'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {!tools || tools.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma ferramenta configurada</p>
              <p className="text-sm">Use os templates acima ou crie uma nova</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tools.map((tool) => {
                const typeConfig = TOOL_TYPE_CONFIG[tool.tool_type] || { icon: Settings, label: tool.tool_type, color: 'bg-gray-500' };
                const TypeIcon = typeConfig.icon;
                const isAvailable = availableTools.includes(tool.id);

                return (
                  <div
                    key={tool.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border ${
                      isAvailable ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${typeConfig.color} text-white`}>
                      <TypeIcon className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tool.display_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {typeConfig.label}
                        </Badge>
                        {!tool.is_active && (
                          <Badge variant="secondary" className="text-xs">Inativa</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {tool.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleToolAvailability(tool.id)}
                        title={isAvailable ? 'Desativar para bot' : 'Ativar para bot'}
                      >
                        {isAvailable ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(tool)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(tool)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo */}
      {tools && tools.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {availableTools.length} de {tools.length} ferramentas ativas para o bot
              </span>
              {availableTools.length === 0 && (
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  Nenhuma ferramenta selecionada
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

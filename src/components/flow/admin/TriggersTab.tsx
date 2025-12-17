// ============================================
// Triggers Tab - Manage flow triggers
// ============================================

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Zap, MessageSquare, Hash, Webhook, Play, Loader2, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FlowTriggerType } from "@/types/flow";

interface TriggerRow {
  id: string;
  flow_id: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  ativo: boolean;
  created_at: string;
  flows?: { nome: string } | null;
}

interface FlowOption {
  id: string;
  nome: string;
}

export function TriggersTab() {
  const [triggers, setTriggers] = useState<TriggerRow[]>([]);
  const [flows, setFlows] = useState<FlowOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<TriggerRow | null>(null);
  const [executingTriggerId, setExecutingTriggerId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [selectedFlowId, setSelectedFlowId] = useState("");
  const [triggerType, setTriggerType] = useState<FlowTriggerType>("button_click");
  const [buttonText, setButtonText] = useState("");
  const [exactMatch, setExactMatch] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [webhookPath, setWebhookPath] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [triggersRes, flowsRes] = await Promise.all([
        supabase
          .from('flow_triggers')
          .select('*, flows(nome)')
          .order('created_at', { ascending: false }),
        supabase
          .from('flows')
          .select('id, nome')
          .eq('ativo', true)
          .order('nome'),
      ]);

      if (triggersRes.error) throw triggersRes.error;
      const typedTriggers = (triggersRes.data || []).map(t => ({
        ...t,
        trigger_config: (t.trigger_config as Record<string, unknown>) || {}
      })) as TriggerRow[];
      if (flowsRes.error) throw flowsRes.error;

      setTriggers(typedTriggers);
      setFlows(flowsRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedFlowId) {
      toast.error('Selecione um flow');
      return;
    }

    const config: Record<string, unknown> = {};
    
    if (triggerType === 'button_click') {
      if (!buttonText.trim()) {
        toast.error('Informe o texto do botão');
        return;
      }
      config.button_text = buttonText.trim();
      config.exact_match = exactMatch;
    } else if (triggerType === 'keyword') {
      if (!keywords.trim()) {
        toast.error('Informe as palavras-chave');
        return;
      }
      config.keywords = keywords.split(',').map(k => k.trim().toLowerCase());
    } else if (triggerType === 'webhook') {
      if (!webhookPath.trim()) {
        toast.error('Informe o path do webhook');
        return;
      }
      config.webhook_path = webhookPath.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    }
    // manual type doesn't need extra config

    try {
      if (editingTrigger) {
        const { error } = await supabase
          .from('flow_triggers')
          .update({
            flow_id: selectedFlowId,
            trigger_type: triggerType,
            trigger_config: config as unknown as Record<string, never>,
          })
          .eq('id', editingTrigger.id);

        if (error) throw error;
        toast.success('Gatilho atualizado');
      } else {
        const { error } = await supabase
          .from('flow_triggers')
          .insert([{
            flow_id: selectedFlowId,
            trigger_type: triggerType,
            trigger_config: config as unknown as Record<string, never>,
            ativo: true,
          }]);

        if (error) throw error;
        toast.success('Gatilho criado');
      }

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Erro ao salvar gatilho:', error);
      toast.error('Erro ao salvar gatilho');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('flow_triggers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Gatilho excluído');
      loadData();
    } catch (error) {
      console.error('Erro ao excluir gatilho:', error);
      toast.error('Erro ao excluir gatilho');
    }
  };

  const handleToggleActive = async (trigger: TriggerRow) => {
    try {
      const { error } = await supabase
        .from('flow_triggers')
        .update({ ativo: !trigger.ativo })
        .eq('id', trigger.id);

      if (error) throw error;
      toast.success(trigger.ativo ? 'Gatilho desativado' : 'Gatilho ativado');
      loadData();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const handleEdit = (trigger: TriggerRow) => {
    setEditingTrigger(trigger);
    setSelectedFlowId(trigger.flow_id);
    setTriggerType(trigger.trigger_type as FlowTriggerType);
    
    const config = trigger.trigger_config;
    if (trigger.trigger_type === 'button_click') {
      setButtonText((config.button_text as string) || '');
      setExactMatch((config.exact_match as boolean) || false);
    } else if (trigger.trigger_type === 'keyword') {
      setKeywords(((config.keywords as string[]) || []).join(', '));
    } else if (trigger.trigger_type === 'webhook') {
      setWebhookPath((config.webhook_path as string) || '');
    }
    
    setDialogOpen(true);
  };

  const handleExecuteTest = async (trigger: TriggerRow) => {
    if (!trigger.ativo) {
      toast.error('Ative o gatilho antes de executar');
      return;
    }

    setExecutingTriggerId(trigger.id);
    
    try {
      // Execute the flow directly via flows-executor
      const { data, error } = await supabase.functions.invoke('flows-executor', {
        body: {
          flowId: trigger.flow_id,
          leadId: 1, // Test lead ID
          phoneNumber: '5511999999999', // Test phone
          context: {
            trigger_type: 'manual_test',
            trigger_id: trigger.id,
            test_mode: true,
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Flow executado! Run ID: ${data.runId}`);
      } else {
        toast.error(data?.error || 'Erro na execução');
      }
    } catch (error) {
      console.error('Erro ao executar flow:', error);
      toast.error('Erro ao executar flow de teste');
    } finally {
      setExecutingTriggerId(null);
    }
  };

  const copyWebhookUrl = (trigger: TriggerRow) => {
    const webhookPath = trigger.trigger_config.webhook_path as string;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/flows-executor?webhook=${webhookPath}`;
    navigator.clipboard.writeText(url);
    setCopiedId(trigger.id);
    toast.success('URL copiada!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetForm = () => {
    setEditingTrigger(null);
    setSelectedFlowId("");
    setTriggerType("button_click");
    setButtonText("");
    setExactMatch(false);
    setKeywords("");
    setWebhookPath("");
  };

  const openNewDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'button_click':
        return <MessageSquare className="h-4 w-4" />;
      case 'keyword':
        return <Hash className="h-4 w-4" />;
      case 'webhook':
        return <Webhook className="h-4 w-4" />;
      case 'manual':
        return <Play className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  const getTriggerDescription = (trigger: TriggerRow) => {
    const config = trigger.trigger_config;
    switch (trigger.trigger_type) {
      case 'button_click':
        return `Botão: "${config.button_text}"${config.exact_match ? ' (exato)' : ''}`;
      case 'keyword':
        return `Palavras: ${(config.keywords as string[])?.join(', ') || ''}`;
      case 'webhook':
        return `Webhook: /${config.webhook_path}`;
      case 'manual':
        return 'Execução manual via admin';
      default:
        return trigger.trigger_type;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Carregando gatilhos...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gatilhos de Automação</CardTitle>
            <CardDescription>
              Configure eventos que disparam flows automaticamente
            </CardDescription>
          </div>
          <Button onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Gatilho
          </Button>
        </CardHeader>
        <CardContent>
          {triggers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p>Nenhum gatilho configurado.</p>
              <Button variant="outline" className="mt-4" onClick={openNewDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro gatilho
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {triggers.map((trigger) => (
                <div
                  key={trigger.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      {getTriggerIcon(trigger.trigger_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">
                          {trigger.flows?.nome || 'Flow removido'}
                        </h3>
                        <Badge variant={trigger.ativo ? "default" : "secondary"}>
                          {trigger.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {trigger.trigger_type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getTriggerDescription(trigger)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Copy webhook URL button */}
                    {trigger.trigger_type === 'webhook' && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyWebhookUrl(trigger)}
                        title="Copiar URL do webhook"
                      >
                        {copiedId === trigger.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    
                    {/* Execute test button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExecuteTest(trigger)}
                      disabled={executingTriggerId === trigger.id || !trigger.ativo}
                      title="Executar teste"
                    >
                      {executingTriggerId === trigger.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <Switch
                      checked={trigger.ativo}
                      onCheckedChange={() => handleToggleActive(trigger)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(trigger)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(trigger.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTrigger ? 'Editar Gatilho' : 'Novo Gatilho'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Flow a executar</Label>
              <Select value={selectedFlowId} onValueChange={setSelectedFlowId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um flow" />
                </SelectTrigger>
                <SelectContent>
                  {flows.map((flow) => (
                    <SelectItem key={flow.id} value={flow.id}>
                      {flow.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de gatilho</Label>
              <Select value={triggerType} onValueChange={(v) => setTriggerType(v as FlowTriggerType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="button_click">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Clique em botão
                    </div>
                  </SelectItem>
                  <SelectItem value="keyword">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Palavra-chave
                    </div>
                  </SelectItem>
                  <SelectItem value="webhook">
                    <div className="flex items-center gap-2">
                      <Webhook className="h-4 w-4" />
                      Webhook externo
                    </div>
                  </SelectItem>
                  <SelectItem value="manual">
                    <div className="flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Manual (teste)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {triggerType === 'button_click' && (
              <>
                <div className="space-y-2">
                  <Label>Texto do botão</Label>
                  <Input
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    placeholder="Ex: Receber Credencial"
                  />
                  <p className="text-xs text-muted-foreground">
                    Texto que o cliente clica no WhatsApp
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="exact-match"
                    checked={exactMatch}
                    onCheckedChange={setExactMatch}
                  />
                  <Label htmlFor="exact-match">Correspondência exata</Label>
                </div>
              </>
            )}

            {triggerType === 'keyword' && (
              <div className="space-y-2">
                <Label>Palavras-chave</Label>
                <Input
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="credencial, foto, enviar"
                />
                <p className="text-xs text-muted-foreground">
                  Separadas por vírgula. Se a mensagem contiver alguma, o flow é disparado.
                </p>
              </div>
            )}

            {triggerType === 'webhook' && (
              <div className="space-y-2">
                <Label>Path do webhook</Label>
                <Input
                  value={webhookPath}
                  onChange={(e) => setWebhookPath(e.target.value)}
                  placeholder="enviar-credencial"
                />
                <p className="text-xs text-muted-foreground">
                  URL: /functions/v1/flows-executor?webhook=<strong>{webhookPath || 'path'}</strong>
                </p>
              </div>
            )}

            {triggerType === 'manual' && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Este gatilho só pode ser disparado manualmente via botão de teste no admin.
                  Útil para testar flows sem precisar de mensagem real.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingTrigger ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================
// Flow Builder Component - Create and Edit Flows
// ============================================

import { useState, useEffect } from "react";
import { Plus, Trash2, Save, X, MoveUp, MoveDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Flow, FlowStep, FlowStepType } from "@/types/flow";

interface FlowBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flow?: Flow | null;
  onSave: (savedFlow?: Flow) => void;
}

export function FlowBuilder({ open, onOpenChange, flow, onSave }: FlowBuilderProps) {
  const [nome, setNome] = useState(flow?.nome || "");
  const [descricao, setDescricao] = useState(flow?.descricao || "");
  const [steps, setSteps] = useState<FlowStep[]>(flow?.steps || []);
  const [saving, setSaving] = useState(false);

  // Update state when flow prop changes
  useEffect(() => {
    if (flow) {
      setNome(flow.nome || "");
      setDescricao(flow.descricao || "");
      setSteps(flow.steps || []);
    }
  }, [flow]);

  // Reset form when flow changes or dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setNome(flow?.nome || "");
      setDescricao(flow?.descricao || "");
      setSteps(flow?.steps || []);
    } else {
      // Reset form when closing
      setNome("");
      setDescricao("");
      setSteps([]);
    }
    onOpenChange(newOpen);
  };

  const addStep = (type: FlowStepType) => {
    const newStep: FlowStep = {
      id: `step-${Date.now()}`,
      type,
      nome: type === 'tabular' ? 'Ação de tabulação' : type === 'http_call' ? 'Chamada HTTP' : 'Aguardar',
      config: type === 'tabular' 
        ? { buttonId: '', webhook_url: '', field: '', value: '' }
        : type === 'http_call'
        ? { url: '', method: 'GET' as const }
        : { seconds: 5 }
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (stepId: string) => {
    setSteps(steps.filter(s => s.id !== stepId));
  };

  const moveStep = (stepId: string, direction: 'up' | 'down') => {
    const index = steps.findIndex(s => s.id === stepId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;

    const newSteps = [...steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    setSteps(newSteps);
  };

  const updateStep = (stepId: string, updates: Partial<FlowStep>) => {
    setSteps(steps.map(s => s.id === stepId ? { ...s, ...updates } : s));
  };

  const updateStepConfig = (stepId: string, configKey: string, value: unknown) => {
    setSteps(steps.map(s => 
      s.id === stepId 
        ? { ...s, config: { ...s.config, [configKey]: value } } 
        : s
    ));
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast.error("Nome do flow é obrigatório");
      return;
    }

    if (steps.length === 0) {
      toast.error("Adicione pelo menos um step ao flow");
      return;
    }

    setSaving(true);
    try {
      const flowData = {
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        steps,
        ativo: true
      };

      let savedFlow: Flow;
      
      if (flow?.id) {
        // Update existing flow
        const { data, error } = await supabase.functions.invoke(`flows-api/${flow.id}`, {
          body: flowData,
          method: 'PUT'
        });

        if (error) throw error;
        savedFlow = data.flow;
        toast.success("Flow atualizado com sucesso!");
      } else {
        // Create new flow
        const { data, error } = await supabase.functions.invoke('flows-api', {
          body: flowData
        });

        if (error) throw error;
        savedFlow = data.flow;
        toast.success("Flow criado com sucesso!");
      }

      onSave(savedFlow);
      handleOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar flow:", error);
      toast.error("Erro ao salvar flow");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{flow?.id ? 'Editar Flow' : 'Novo Flow'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic info */}
          <div className="space-y-2">
            <Label>Nome do Flow *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Qualificação Completa"
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição opcional do flow"
              rows={2}
            />
          </div>

          {/* Steps */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Steps do Flow</Label>
              <div className="flex gap-2">
                <Button onClick={() => addStep('tabular')} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" /> Tabular
                </Button>
                <Button onClick={() => addStep('http_call')} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" /> HTTP
                </Button>
                <Button onClick={() => addStep('wait')} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" /> Aguardar
                </Button>
              </div>
            </div>

            {steps.length === 0 && (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                Nenhum step adicionado. Clique nos botões acima para adicionar steps ao flow.
              </Card>
            )}

            {steps.map((step, index) => (
              <Card key={step.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">#{index + 1}</span>
                    <Input
                      value={step.nome}
                      onChange={(e) => updateStep(step.id, { nome: e.target.value })}
                      placeholder="Nome do step"
                      className="w-64"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveStep(step.id, 'up')}
                      disabled={index === 0}
                    >
                      <MoveUp className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveStep(step.id, 'down')}
                      disabled={index === steps.length - 1}
                    >
                      <MoveDown className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeStep(step.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Step configuration based on type */}
                {step.type === 'tabular' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Webhook URL *</Label>
                      <Input
                        value={step.config.webhook_url || ''}
                        onChange={(e) => updateStepConfig(step.id, 'webhook_url', e.target.value)}
                        placeholder="https://..."
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Campo *</Label>
                      <Input
                        value={step.config.field || ''}
                        onChange={(e) => updateStepConfig(step.id, 'field', e.target.value)}
                        placeholder="STATUS_ID"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Valor *</Label>
                      <Input
                        value={step.config.value || ''}
                        onChange={(e) => updateStepConfig(step.id, 'value', e.target.value)}
                        placeholder="CONVERTED"
                        className="text-sm"
                      />
                    </div>
                  </div>
                )}

                {step.type === 'http_call' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-3">
                      <div className="col-span-1">
                        <Label className="text-xs">Método *</Label>
                        <Select
                          value={step.config.method || 'GET'}
                          onValueChange={(val) => updateStepConfig(step.id, 'method', val)}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="PATCH">PATCH</SelectItem>
                            <SelectItem value="DELETE">DELETE</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">URL *</Label>
                        <Input
                          value={step.config.url || ''}
                          onChange={(e) => updateStepConfig(step.id, 'url', e.target.value)}
                          placeholder="https://api.example.com/endpoint"
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step.type === 'wait' && (
                  <div className="w-48">
                    <Label className="text-xs">Segundos *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={step.config.seconds || 5}
                      onChange={(e) => updateStepConfig(step.id, 'seconds', parseInt(e.target.value) || 5)}
                      className="text-sm"
                    />
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            <X className="w-4 h-4 mr-1" /> Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-1" /> {saving ? 'Salvando...' : 'Salvar Flow'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

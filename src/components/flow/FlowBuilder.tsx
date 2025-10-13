// ============================================
// Flow Builder Component - Create and Edit Flows with Visual Editor
// ============================================

import { useState } from "react";
import { Node } from "reactflow";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Flow, FlowStep, FlowStepType } from "@/types/flow";
import { VisualFlowEditor } from "./visual/VisualFlowEditor";
import { NodePalette } from "./visual/NodePalette";
import { NodeConfigPanel } from "./visual/NodeConfigPanel";

interface FlowBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flow?: Flow | null;
  onSave: () => void;
}

export function FlowBuilder({ open, onOpenChange, flow, onSave }: FlowBuilderProps) {
  const [nome, setNome] = useState(flow?.nome || "");
  const [descricao, setDescricao] = useState(flow?.descricao || "");
  const [steps, setSteps] = useState<FlowStep[]>(flow?.steps || []);
  const [saving, setSaving] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Reset form when flow changes or dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setNome(flow?.nome || "");
      setDescricao(flow?.descricao || "");
      setSteps(flow?.steps || []);
      setSelectedNode(null);
    } else {
      // Reset form when closing
      setNome("");
      setDescricao("");
      setSteps([]);
      setSelectedNode(null);
    }
    onOpenChange(newOpen);
  };

  const addStep = (type: FlowStepType) => {
    let newStep: FlowStep;
    
    if (type === 'tabular') {
      newStep = {
        id: `step-${Date.now()}`,
        type: 'tabular',
        nome: 'Ação de tabulação',
        config: { buttonId: '', webhook_url: '', field: '', value: '' }
      };
    } else if (type === 'http_call') {
      newStep = {
        id: `step-${Date.now()}`,
        type: 'http_call',
        nome: 'Chamada HTTP',
        config: { url: '', method: 'GET' as const }
      };
    } else {
      newStep = {
        id: `step-${Date.now()}`,
        type: 'wait',
        nome: 'Aguardar',
        config: { seconds: 5 }
      };
    }
    
    setSteps([...steps, newStep]);
  };

  const updateNode = (nodeId: string, updates: Partial<FlowStep>) => {
    setSteps(steps.map(s => s.id === nodeId ? { ...s, ...updates } as FlowStep : s));
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

      if (flow?.id) {
        // Update existing flow
        const { error } = await supabase.functions.invoke('flows-api', {
          body: flowData,
          method: 'PUT'
        });

        if (error) throw error;
        toast.success("Flow atualizado com sucesso!");
      } else {
        // Create new flow
        const { error } = await supabase.functions.invoke('flows-api', {
          body: flowData
        });

        if (error) throw error;
        toast.success("Flow criado com sucesso!");
      }

      onSave();
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
      <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{flow?.id ? 'Editar Flow' : 'Novo Flow'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
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
          </div>

          {/* Visual Editor */}
          <div className="flex-1 grid grid-cols-[250px_1fr_300px] gap-4 min-h-0">
            {/* Node Palette */}
            <div className="overflow-y-auto">
              <NodePalette onAddNode={addStep} />
            </div>

            {/* Canvas */}
            <div className="min-h-0">
              <VisualFlowEditor
                initialSteps={steps}
                onChange={setSteps}
              />
            </div>
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

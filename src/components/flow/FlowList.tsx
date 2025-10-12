// ============================================
// Flow List Component - Display and Manage Flows
// ============================================

import { useState, useEffect } from "react";
import { Play, Edit, Trash2, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Flow } from "@/types/flow";
import { FlowBuilder } from "./FlowBuilder";
import { FlowExecuteModal } from "./FlowExecuteModal";

interface FlowListProps {
  onExecuteFlow?: (flowId: string) => void;
}

export function FlowList({ onExecuteFlow }: FlowListProps) {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [executeModalOpen, setExecuteModalOpen] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);

  useEffect(() => {
    loadFlows();
  }, []);

  const loadFlows = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('flows-api', {
        method: 'GET'
      });

      if (error) throw error;

      setFlows(data.flows || []);
    } catch (error) {
      console.error("Erro ao carregar flows:", error);
      toast.error("Erro ao carregar flows");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (flow: Flow) => {
    setSelectedFlow(flow);
    setBuilderOpen(true);
  };

  const handleDelete = async (flowId: string) => {
    if (!confirm("Tem certeza que deseja excluir este flow?")) return;

    try {
      const { error } = await supabase.functions.invoke(`flows-api/${flowId}`, {
        method: 'DELETE'
      });

      if (error) throw error;

      toast.success("Flow excluído com sucesso");
      loadFlows();
    } catch (error) {
      console.error("Erro ao excluir flow:", error);
      toast.error("Erro ao excluir flow");
    }
  };

  const handleExecute = (flow: Flow) => {
    setSelectedFlow(flow);
    setExecuteModalOpen(true);
  };

  const handleNewFlow = () => {
    setSelectedFlow(null);
    setBuilderOpen(true);
  };

  const handleBuilderClose = () => {
    setBuilderOpen(false);
    setSelectedFlow(null);
  };

  const handleExecuteModalClose = () => {
    setExecuteModalOpen(false);
    setSelectedFlow(null);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Carregando flows...
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Flows Disponíveis</h2>
          <div className="flex gap-2">
            <Button onClick={loadFlows} size="sm" variant="outline">
              <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
            </Button>
            <Button onClick={handleNewFlow} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Novo Flow
            </Button>
          </div>
        </div>

        {flows.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Nenhum flow criado ainda.
            </p>
            <Button onClick={handleNewFlow} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Criar Primeiro Flow
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {flows.map((flow) => (
              <Card key={flow.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{flow.nome}</h3>
                      {flow.descricao && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {flow.descricao}
                        </p>
                      )}
                    </div>
                    <Badge variant={flow.ativo ? "default" : "secondary"} className="ml-2">
                      {flow.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{flow.steps.length} step{flow.steps.length !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span className="truncate">
                      {new Date(flow.criado_em).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleExecute(flow)}
                      size="sm"
                      className="flex-1"
                      disabled={!flow.ativo}
                    >
                      <Play className="w-4 h-4 mr-1" /> Executar
                    </Button>
                    <Button
                      onClick={() => handleEdit(flow)}
                      size="sm"
                      variant="outline"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(flow.id)}
                      size="sm"
                      variant="outline"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <FlowBuilder
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        flow={selectedFlow}
        onSave={() => {
          handleBuilderClose();
          loadFlows();
        }}
      />

      <FlowExecuteModal
        open={executeModalOpen}
        onOpenChange={setExecuteModalOpen}
        flow={selectedFlow}
        onComplete={() => {
          handleExecuteModalClose();
          if (onExecuteFlow && selectedFlow) {
            onExecuteFlow(selectedFlow.id);
          }
        }}
      />
    </>
  );
}

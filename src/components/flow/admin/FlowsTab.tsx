// ============================================
// Flows Tab - List and manage flows
// ============================================

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Edit, Trash2, MoreVertical, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FlowBuilder } from "@/components/flow/FlowBuilder";
import { FlowExecuteModal } from "@/components/flow/FlowExecuteModal";
import type { Flow, FlowStep } from "@/types/flow";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FlowRow {
  id: string;
  nome: string;
  descricao: string | null;
  steps: FlowStep[];
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export function FlowsTab() {
  const [flows, setFlows] = useState<FlowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [executeOpen, setExecuteOpen] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadFlows();
  }, []);

  const loadFlows = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('flows')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const typedFlows = (data || []).map(flow => ({
        ...flow,
        steps: (flow.steps as unknown as FlowStep[]) || []
      }));
      
      setFlows(typedFlows);
    } catch (error) {
      console.error('Erro ao carregar flows:', error);
      toast.error('Erro ao carregar flows');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (flow: FlowRow) => {
    setSelectedFlow({
      id: flow.id,
      nome: flow.nome,
      descricao: flow.descricao || undefined,
      steps: flow.steps,
      ativo: flow.ativo,
      criado_em: flow.created_at,
      atualizado_em: flow.updated_at,
    });
    setBuilderOpen(true);
  };

  const handleExecute = (flow: FlowRow) => {
    setSelectedFlow({
      id: flow.id,
      nome: flow.nome,
      descricao: flow.descricao || undefined,
      steps: flow.steps,
      ativo: flow.ativo,
      criado_em: flow.created_at,
      atualizado_em: flow.updated_at,
    });
    setExecuteOpen(true);
  };

  const handleDelete = async () => {
    if (!flowToDelete) return;
    
    try {
      const { error } = await supabase
        .from('flows')
        .delete()
        .eq('id', flowToDelete);

      if (error) throw error;
      toast.success('Flow excluído');
      loadFlows();
    } catch (error) {
      console.error('Erro ao excluir flow:', error);
      toast.error('Erro ao excluir flow');
    } finally {
      setDeleteDialogOpen(false);
      setFlowToDelete(null);
    }
  };

  const handleDuplicate = async (flow: FlowRow) => {
    try {
      const { error } = await supabase
        .from('flows')
        .insert([{
          nome: `${flow.nome} (cópia)`,
          descricao: flow.descricao,
          steps: JSON.parse(JSON.stringify(flow.steps)),
          ativo: false,
        }]);

      if (error) throw error;
      toast.success('Flow duplicado');
      loadFlows();
    } catch (error) {
      console.error('Erro ao duplicar flow:', error);
      toast.error('Erro ao duplicar flow');
    }
  };

  const handleToggleActive = async (flow: FlowRow) => {
    try {
      const { error } = await supabase
        .from('flows')
        .update({ ativo: !flow.ativo })
        .eq('id', flow.id);

      if (error) throw error;
      toast.success(flow.ativo ? 'Flow desativado' : 'Flow ativado');
      loadFlows();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const handleNewFlow = () => {
    setSelectedFlow(null);
    setBuilderOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Carregando flows...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Flows de Automação</CardTitle>
            <CardDescription>
              Gerencie seus flows de automação sequencial
            </CardDescription>
          </div>
          <Button onClick={handleNewFlow}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Flow
          </Button>
        </CardHeader>
        <CardContent>
          {flows.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p>Nenhum flow criado ainda.</p>
              <Button variant="outline" className="mt-4" onClick={handleNewFlow}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro flow
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {flows.map((flow) => (
                <div
                  key={flow.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{flow.nome}</h3>
                        <Badge variant={flow.ativo ? "default" : "secondary"}>
                          {flow.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {flow.descricao || "Sem descrição"} • {flow.steps.length} steps
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExecute(flow)}
                      disabled={!flow.ativo}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Executar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(flow)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDuplicate(flow)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(flow)}>
                          {flow.ativo ? "Desativar" : "Ativar"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setFlowToDelete(flow.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <FlowBuilder
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        flow={selectedFlow}
        onSave={loadFlows}
      />

      {selectedFlow && (
        <FlowExecuteModal
          open={executeOpen}
          onOpenChange={setExecuteOpen}
          flow={selectedFlow}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Flow?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O flow e todos os seus gatilhos serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

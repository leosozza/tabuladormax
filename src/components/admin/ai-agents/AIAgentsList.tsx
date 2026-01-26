import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Bot, Edit, Trash2, GraduationCap, Power } from 'lucide-react';
import { useAIAgents, AIAgent } from '@/hooks/useAIAgents';
import { AIAgentFormDialog } from './AIAgentFormDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AIAgentsListProps {
  onSelectForTraining: (agentId: string) => void;
}

export function AIAgentsList({ onSelectForTraining }: AIAgentsListProps) {
  const { agents, loading, saving, createAgent, updateAgent, deleteAgent } = useAIAgents();
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<AIAgent | null>(null);

  const handleCreate = () => {
    setEditingAgent(null);
    setShowForm(true);
  };

  const handleEdit = (agent: AIAgent) => {
    setEditingAgent(agent);
    setShowForm(true);
  };

  const handleSave = async (data: Omit<AIAgent, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    if (editingAgent) {
      const success = await updateAgent(editingAgent.id, data);
      if (success) setShowForm(false);
    } else {
      const result = await createAgent(data);
      if (result) setShowForm(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingAgent) return;
    await deleteAgent(deletingAgent.id);
    setDeletingAgent(null);
  };

  const handleToggleActive = async (agent: AIAgent) => {
    await updateAgent(agent.id, { is_active: !agent.is_active });
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium">Agentes de IA</h3>
          <p className="text-sm text-muted-foreground">
            Cada agente possui seu próprio prompt de sistema e treinamento
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Agente
        </Button>
      </div>

      {agents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Nenhum agente criado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie seu primeiro agente de IA para começar
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Agente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.id} className={!agent.is_active ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{agent.name}</CardTitle>
                  </div>
                  <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                    {agent.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {agent.description || 'Sem descrição'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Provedor:</span>
                    <span className="font-medium">{agent.ai_provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Modelo:</span>
                    <span className="font-medium truncate max-w-[150px]">{agent.ai_model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Personalidade:</span>
                    <span className="font-medium">{agent.personality}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onSelectForTraining(agent.id)}
                  >
                    <GraduationCap className="h-4 w-4 mr-1" />
                    Treinar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleActive(agent)}
                    disabled={saving}
                  >
                    <Power className={`h-4 w-4 ${agent.is_active ? 'text-green-500' : 'text-muted-foreground'}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(agent)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingAgent(agent)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AIAgentFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        agent={editingAgent}
        onSave={handleSave}
        saving={saving}
      />

      <AlertDialog open={!!deletingAgent} onOpenChange={() => setDeletingAgent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O agente "{deletingAgent?.name}" e todos os seus treinamentos serão removidos permanentemente.
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

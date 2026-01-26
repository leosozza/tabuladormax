import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, GraduationCap, Edit, Trash2, BookOpen, Power } from 'lucide-react';
import { useAIAgentTraining, AIAgent, AIAgentTraining } from '@/hooks/useAIAgents';
import { AIAgentTrainingFormDialog } from './AIAgentTrainingFormDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface AIAgentTrainingListProps {
  agents: AIAgent[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string | null) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  saudacao: 'Saudação',
  produtos: 'Produtos',
  objecoes: 'Objeções',
  fechamento: 'Fechamento',
  faq: 'FAQ',
  geral: 'Geral',
};

const CATEGORY_COLORS: Record<string, string> = {
  saudacao: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  produtos: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  objecoes: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  fechamento: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  faq: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  geral: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

export function AIAgentTrainingList({
  agents,
  selectedAgentId,
  onSelectAgent,
}: AIAgentTrainingListProps) {
  const { trainings, loading, saving, createTraining, updateTraining, deleteTraining } = useAIAgentTraining(selectedAgentId);
  const [showForm, setShowForm] = useState(false);
  const [editingTraining, setEditingTraining] = useState<AIAgentTraining | null>(null);
  const [deletingTraining, setDeletingTraining] = useState<AIAgentTraining | null>(null);

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  const handleCreate = () => {
    setEditingTraining(null);
    setShowForm(true);
  };

  const handleEdit = (training: AIAgentTraining) => {
    setEditingTraining(training);
    setShowForm(true);
  };

  const handleSave = async (data: Omit<AIAgentTraining, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingTraining) {
      const success = await updateTraining(editingTraining.id, data);
      if (success) setShowForm(false);
    } else {
      const success = await createTraining(data);
      if (success) setShowForm(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTraining) return;
    await deleteTraining(deletingTraining.id);
    setDeletingTraining(null);
  };

  const handleToggleActive = async (training: AIAgentTraining) => {
    await updateTraining(training.id, { is_active: !training.is_active });
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex-1">
          <h3 className="text-lg font-medium">Treinamentos do Agente</h3>
          <p className="text-sm text-muted-foreground">
            Adicione instruções e conhecimentos específicos para o agente
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            value={selectedAgentId || ''}
            onValueChange={(value) => onSelectAgent(value || null)}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Selecione um agente" />
            </SelectTrigger>
            <SelectContent>
              {agents.filter(a => a.is_active).map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedAgentId && (
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Adicionar</span>
            </Button>
          )}
        </div>
      </div>

      {!selectedAgentId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Selecione um agente</h3>
            <p className="text-sm text-muted-foreground">
              Escolha um agente para gerenciar seus treinamentos
            </p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : trainings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Nenhum treinamento</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione instruções e conhecimentos para "{selectedAgent?.name}"
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Treinamento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {trainings.map((training) => (
            <Card key={training.id} className={!training.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={CATEGORY_COLORS[training.category] || CATEGORY_COLORS.geral}>
                      {CATEGORY_LABELS[training.category] || training.category}
                    </Badge>
                    <CardTitle className="text-base">{training.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      Prioridade: {training.priority}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleToggleActive(training)}
                      disabled={saving}
                    >
                      <Power className={`h-4 w-4 ${training.is_active ? 'text-green-500' : 'text-muted-foreground'}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(training)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDeletingTraining(training)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                  {training.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedAgentId && (
        <AIAgentTrainingFormDialog
          open={showForm}
          onOpenChange={setShowForm}
          training={editingTraining}
          agentId={selectedAgentId}
          onSave={handleSave}
          saving={saving}
        />
      )}

      <AlertDialog open={!!deletingTraining} onOpenChange={() => setDeletingTraining(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir treinamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O treinamento "{deletingTraining?.title}" será removido permanentemente.
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

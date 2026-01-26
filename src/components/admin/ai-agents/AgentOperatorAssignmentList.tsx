import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Users, Trash2, Bot, UserCheck, Search } from 'lucide-react';
import { useAgentOperatorAssignments, AIAgent } from '@/hooks/useAIAgents';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { toast } from 'sonner';

interface TelemarketingOperator {
  id: string;
  bitrix_id: number;
  name: string;
  photo_url: string | null;
  status: string;
}

interface AgentOperatorAssignmentListProps {
  agents: AIAgent[];
}

export function AgentOperatorAssignmentList({ agents }: AgentOperatorAssignmentListProps) {
  const { assignments, loading, saving, assignOperator, unassignOperator } = useAgentOperatorAssignments();
  const [operators, setOperators] = useState<TelemarketingOperator[]>([]);
  const [loadingOperators, setLoadingOperators] = useState(true);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('');
  const [removingAssignment, setRemovingAssignment] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchOperators() {
      setLoadingOperators(true);
      try {
        const { data, error } = await supabase
          .from('telemarketing_operators')
          .select('id, bitrix_id, name, photo_url, status')
          .eq('status', 'ativo')
          .order('name');

        if (error) throw error;
        setOperators(data || []);
      } catch (err) {
        console.error('Error fetching operators:', err);
        toast.error('Erro ao carregar operadores');
      } finally {
        setLoadingOperators(false);
      }
    }

    fetchOperators();
  }, []);

  const assignedOperatorIds = assignments.map(a => a.operator_bitrix_id);
  const unassignedOperators = operators.filter(op => !assignedOperatorIds.includes(op.bitrix_id));

  const filteredAssignments = assignments.filter(assignment => {
    const operator = operators.find(op => op.bitrix_id === assignment.operator_bitrix_id);
    const agent = agents.find(a => a.id === assignment.agent_id);
    const searchLower = searchTerm.toLowerCase();
    
    return (
      operator?.name.toLowerCase().includes(searchLower) ||
      agent?.name.toLowerCase().includes(searchLower) ||
      assignment.operator_bitrix_id.toString().includes(searchTerm)
    );
  });

  const handleAssign = async () => {
    if (!selectedAgentId || !selectedOperatorId) {
      toast.error('Selecione um agente e um operador');
      return;
    }

    const operator = operators.find(op => op.id === selectedOperatorId);
    if (!operator) return;

    const success = await assignOperator(selectedAgentId, operator.bitrix_id);
    if (success) {
      setShowAssignDialog(false);
      setSelectedAgentId('');
      setSelectedOperatorId('');
    }
  };

  const handleUnassign = async () => {
    if (!removingAssignment) return;
    await unassignOperator(removingAssignment);
    setRemovingAssignment(null);
  };

  const activeAgents = agents.filter(a => a.is_active);

  if (loading || loadingOperators) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-medium">Vínculos Operador-Agente</h3>
          <p className="text-sm text-muted-foreground">
            Cada operador usa o agente vinculado para gerar respostas
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full sm:w-[200px]"
            />
          </div>
          <Button onClick={() => setShowAssignDialog(true)} disabled={activeAgents.length === 0 || unassignedOperators.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Vincular</span>
          </Button>
        </div>
      </div>

      {activeAgents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Nenhum agente ativo</h3>
            <p className="text-sm text-muted-foreground">
              Crie e ative pelo menos um agente antes de vincular operadores
            </p>
          </CardContent>
        </Card>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Nenhum vínculo criado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Vincule operadores a agentes para personalizar as respostas de IA
            </p>
            <Button onClick={() => setShowAssignDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Vínculo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Group by agent */}
          {activeAgents.map((agent) => {
            const agentAssignments = filteredAssignments.filter(a => a.agent_id === agent.id);
            if (agentAssignments.length === 0 && searchTerm) return null;
            
            return (
              <Card key={agent.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{agent.name}</CardTitle>
                    <Badge variant="outline">{agentAssignments.length} operador(es)</Badge>
                  </div>
                  <CardDescription>{agent.description}</CardDescription>
                </CardHeader>
                {agentAssignments.length > 0 && (
                  <CardContent>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {agentAssignments.map((assignment) => {
                        const operator = operators.find(op => op.bitrix_id === assignment.operator_bitrix_id);
                        
                        return (
                          <div
                            key={assignment.id}
                            className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                          >
                            {operator?.photo_url ? (
                              <img
                                src={operator.photo_url}
                                alt={operator.name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <UserCheck className="h-5 w-5 text-primary" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {operator?.name || `Operador ${assignment.operator_bitrix_id}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Bitrix ID: {assignment.operator_bitrix_id}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => setRemovingAssignment(assignment.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Operador a Agente</DialogTitle>
            <DialogDescription>
              O operador usará o agente selecionado para gerar respostas de IA
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Agente de IA</label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um agente" />
                </SelectTrigger>
                <SelectContent>
                  {activeAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Operador</label>
              <Select value={selectedOperatorId} onValueChange={setSelectedOperatorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um operador" />
                </SelectTrigger>
                <SelectContent>
                  {unassignedOperators.map((operator) => (
                    <SelectItem key={operator.id} value={operator.id}>
                      <div className="flex items-center gap-2">
                        {operator.photo_url ? (
                          <img
                            src={operator.photo_url}
                            alt={operator.name}
                            className="h-6 w-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                            <UserCheck className="h-3 w-3" />
                          </div>
                        )}
                        <span>{operator.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {unassignedOperators.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Todos os operadores já estão vinculados
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAssign} disabled={saving || !selectedAgentId || !selectedOperatorId}>
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={!!removingAssignment} onOpenChange={() => setRemovingAssignment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover vínculo?</AlertDialogTitle>
            <AlertDialogDescription>
              O operador voltará a usar o comportamento padrão de IA (sem agente personalizado).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnassign} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

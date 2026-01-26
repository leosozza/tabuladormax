import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Link2, Unlink, FileText, BookOpen, Search } from 'lucide-react';
import { useAgentTrainingLinks, TrainingInstruction } from '@/hooks/useAgentTrainingLinks';
import { AIAgent } from '@/hooks/useAIAgents';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AgentTrainingLinksManagerProps {
  agents: AIAgent[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string | null) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  procedures: 'Procedimentos',
  product_knowledge: 'Produto',
  responses: 'Respostas',
  business_rules: 'Regras',
  other: 'Outros',
};

const CATEGORY_COLORS: Record<string, string> = {
  procedures: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  product_knowledge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  responses: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  business_rules: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

export function AgentTrainingLinksManager({
  agents,
  selectedAgentId,
  onSelectAgent,
}: AgentTrainingLinksManagerProps) {
  const { links, availableTrainings, loading, saving, linkTraining, unlinkTraining } = useAgentTrainingLinks(selectedAgentId);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  // Filter trainings that are not already linked
  const linkedTrainingIds = new Set(links.map(l => l.training_id));
  const unlinkedTrainings = availableTrainings.filter(t => !linkedTrainingIds.has(t.id));
  
  // Apply search filter
  const filteredTrainings = unlinkedTrainings.filter(t =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.category && t.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleLink = async (trainingId: string) => {
    const success = await linkTraining(trainingId);
    if (success) {
      setShowLinkDialog(false);
    }
  };

  const handleUnlink = async () => {
    if (!unlinkingId) return;
    await unlinkTraining(unlinkingId);
    setUnlinkingId(null);
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex-1">
          <h3 className="text-lg font-medium">Treinamentos Vinculados</h3>
          <p className="text-sm text-muted-foreground">
            Vincule treinamentos do sistema ao agente selecionado
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
            <Button onClick={() => setShowLinkDialog(true)} disabled={unlinkedTrainings.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Vincular</span>
            </Button>
          )}
        </div>
      </div>

      {!selectedAgentId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Link2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Selecione um agente</h3>
            <p className="text-sm text-muted-foreground">
              Escolha um agente para gerenciar seus treinamentos vinculados
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
            </Card>
          ))}
        </div>
      ) : links.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Nenhum treinamento vinculado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Vincule treinamentos existentes ao agente "{selectedAgent?.name}"
            </p>
            <Button onClick={() => setShowLinkDialog(true)} disabled={unlinkedTrainings.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Vincular Treinamento
            </Button>
            {unlinkedTrainings.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Nenhum treinamento disponível. Crie treinamentos em /admin/ai-training primeiro.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <Card key={link.id}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-base">{link.training?.title || 'Sem título'}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {link.training?.category && (
                          <Badge className={CATEGORY_COLORS[link.training.category] || CATEGORY_COLORS.other}>
                            {CATEGORY_LABELS[link.training.category] || link.training.category}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          Prioridade: {link.training?.priority || 0}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setUnlinkingId(link.id)}
                    disabled={saving}
                  >
                    <Unlink className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Link Training Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Vincular Treinamento</DialogTitle>
            <DialogDescription>
              Selecione um treinamento para vincular ao agente "{selectedAgent?.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar treinamentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[300px] pr-4">
              {filteredTrainings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {unlinkedTrainings.length === 0 
                    ? 'Todos os treinamentos já estão vinculados'
                    : 'Nenhum treinamento encontrado'}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTrainings.map((training) => (
                    <Card
                      key={training.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleLink(training.id)}
                    >
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-sm">{training.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              {training.category && (
                                <Badge className={`text-xs ${CATEGORY_COLORS[training.category] || CATEGORY_COLORS.other}`}>
                                  {CATEGORY_LABELS[training.category] || training.category}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                Prioridade: {training.priority}
                              </span>
                            </div>
                          </div>
                          <Plus className="h-4 w-4 text-primary" />
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unlink Confirmation */}
      <AlertDialog open={!!unlinkingId} onOpenChange={() => setUnlinkingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular treinamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O treinamento será removido deste agente, mas continuará disponível no sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlink} className="bg-destructive text-destructive-foreground">
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

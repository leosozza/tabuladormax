import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  FileText, 
  Trash2, 
  Edit, 
  ChevronDown, 
  ChevronUp,
  Filter,
  AlertCircle
} from 'lucide-react';
import {
  useAITrainingInstructions,
  useDeleteInstruction,
  useToggleInstructionActive,
  type AITrainingInstruction,
} from '@/hooks/useAITraining';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const CATEGORIES = {
  procedures: 'Procedimentos',
  product_knowledge: 'Conhecimento de Produto',
  responses: 'Tom de Resposta',
  business_rules: 'Regras de Negócio',
  other: 'Outros',
};

const TYPE_LABELS = {
  text: 'Texto',
  pdf: 'PDF',
  document: 'Documento',
};

export function TrainingList() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: instructions, isLoading } = useAITrainingInstructions();
  const deleteInstruction = useDeleteInstruction();
  const toggleActive = useToggleInstructionActive();

  const filteredInstructions = instructions?.filter(
    (inst) => filterCategory === 'all' || inst.category === filterCategory
  );

  const handleDelete = async () => {
    if (deleteId) {
      await deleteInstruction.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center">Carregando instruções...</p>
      </Card>
    );
  }

  if (!instructions || instructions.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-2">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Nenhuma instrução cadastrada ainda</p>
          <p className="text-sm text-muted-foreground">
            Adicione documentos ou instruções manuais para começar
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Filter */}
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {Object.entries(CATEGORIES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground ml-auto">
              {filteredInstructions?.length} instrução(ões)
            </span>
          </div>
        </Card>

        {/* Instructions List */}
        <div className="space-y-2">
          {filteredInstructions?.map((instruction) => (
            <Card key={instruction.id} className="p-4">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <FileText className="w-5 h-5 text-primary mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{instruction.title}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline">
                          {CATEGORIES[instruction.category as keyof typeof CATEGORIES] || instruction.category}
                        </Badge>
                        <Badge variant="secondary">
                          {TYPE_LABELS[instruction.type as keyof typeof TYPE_LABELS]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Prioridade: {instruction.priority}
                        </span>
                        {instruction.usage_count > 0 && (
                          <span className="text-xs text-muted-foreground">
                            Usado {instruction.usage_count}x
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={instruction.is_active}
                      onCheckedChange={(checked) =>
                        toggleActive.mutate({ id: instruction.id, is_active: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setExpandedId(expandedId === instruction.id ? null : instruction.id)
                      }
                    >
                      {expandedId === instruction.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(instruction.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedId === instruction.id && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="bg-muted/50 p-3 rounded-md">
                      <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">
                        {instruction.content}
                      </pre>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span>Criado: {new Date(instruction.created_at).toLocaleDateString('pt-BR')}</span>
                      {instruction.last_used_at && (
                        <span>
                          Último uso: {new Date(instruction.last_used_at).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta instrução? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

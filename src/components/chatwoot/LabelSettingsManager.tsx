import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Pencil, Trash2, Plus, Lock } from 'lucide-react';
import { useConversationLabels, type ConversationLabel } from '@/hooks/useConversationLabels';
import { LabelFormDialog } from './LabelFormDialog';
import { supabase } from '@/integrations/supabase/client';

interface LabelSettingsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LabelSettingsManager({ open, onOpenChange }: LabelSettingsManagerProps) {
  const { labels, loading, createLabel, updateLabel, deleteLabel } = useConversationLabels();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<ConversationLabel | null>(null);
  const [deletingLabel, setDeletingLabel] = useState<ConversationLabel | null>(null);

  // Get current user
  useState(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  });

  const handleCreate = () => {
    setEditingLabel(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (label: ConversationLabel) => {
    setEditingLabel(label);
    setFormDialogOpen(true);
  };

  const handleDelete = (label: ConversationLabel) => {
    setDeletingLabel(label);
  };

  const confirmDelete = async () => {
    if (deletingLabel) {
      await deleteLabel(deletingLabel.id);
      setDeletingLabel(null);
    }
  };

  const handleFormSubmit = async (name: string, color: string) => {
    if (editingLabel) {
      await updateLabel(editingLabel.id, name, color);
    } else {
      await createLabel(name, color);
    }
  };

  const canEdit = (label: ConversationLabel) => {
    return currentUserId && label.created_by === currentUserId;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Gerenciar Etiquetas
              <Button size="sm" onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-1" />
                Nova
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Carregando...
              </p>
            ) : labels.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma etiqueta criada ainda.
              </p>
            ) : (
              labels.map((label) => {
                const editable = canEdit(label);
                return (
                  <div
                    key={label.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className="px-3 py-1 rounded-md text-sm font-medium border-2"
                        style={{
                          borderColor: label.color,
                          backgroundColor: `${label.color}15`,
                          color: label.color,
                        }}
                      >
                        {label.name}
                      </div>
                      {!editable && (
                        <Lock className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex gap-1">
                      {editable ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(label)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(label)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground px-2">
                          Somente leitura
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <LabelFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        onSubmit={handleFormSubmit}
        editingLabel={editingLabel}
      />

      <AlertDialog open={!!deletingLabel} onOpenChange={(open) => !open && setDeletingLabel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir etiqueta?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a etiqueta "{deletingLabel?.name}"?
              Esta ação removerá a etiqueta de todas as conversas associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

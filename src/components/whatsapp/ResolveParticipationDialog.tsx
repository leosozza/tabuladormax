import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { UserCheck, Loader2 } from 'lucide-react';
import { useResolveMyParticipation } from '@/hooks/useMyParticipation';

interface ResolveParticipationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
  participationId: string;
  contactName?: string;
  onResolved?: () => void;
}

export function ResolveParticipationDialog({
  open,
  onOpenChange,
  phoneNumber,
  participationId,
  contactName,
  onResolved,
}: ResolveParticipationDialogProps) {
  const [notes, setNotes] = useState('');
  const resolveParticipation = useResolveMyParticipation();

  const handleResolve = async () => {
    await resolveParticipation.mutateAsync({
      phoneNumber,
      participationId,
    });
    setNotes('');
    onOpenChange(false);
    onResolved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-blue-600" />
            Marcar como Resolvido
          </DialogTitle>
          <DialogDescription>
            Encerrar sua participação na conversa com {contactName || phoneNumber}? 
            Você será removido da lista de participantes desta conversa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Ex: Atendimento concluído, informação repassada..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={resolveParticipation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleResolve}
            disabled={resolveParticipation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {resolveParticipation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resolvendo...
              </>
            ) : (
              <>
                <UserCheck className="mr-2 h-4 w-4" />
                Marcar como Resolvido
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

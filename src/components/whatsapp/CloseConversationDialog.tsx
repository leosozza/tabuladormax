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
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useCloseConversation } from '@/hooks/useCloseConversation';

interface CloseConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
  bitrixId?: string;
  contactName?: string;
}

export function CloseConversationDialog({
  open,
  onOpenChange,
  phoneNumber,
  bitrixId,
  contactName,
}: CloseConversationDialogProps) {
  const [reason, setReason] = useState('');
  const closeConversation = useCloseConversation();

  const handleClose = async () => {
    await closeConversation.mutateAsync({
      phoneNumber,
      bitrixId,
      reason: reason.trim() || undefined,
    });
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Encerrar Conversa
          </DialogTitle>
          <DialogDescription>
            Encerrar a conversa com {contactName || phoneNumber}? 
            Isso marcará a conversa como resolvida e ela não aparecerá mais como "aguardando resposta".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo do encerramento (opcional)</Label>
            <Textarea
              id="reason"
              placeholder="Ex: Cliente atendido, agendamento realizado, sem interesse..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={closeConversation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleClose}
            disabled={closeConversation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {closeConversation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Encerrando...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Encerrar Conversa
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

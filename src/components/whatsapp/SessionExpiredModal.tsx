import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RefreshCw, LogIn } from 'lucide-react';

interface SessionExpiredModalProps {
  open: boolean;
  onRelogin: () => void;
  onClose?: () => void;
}

export function SessionExpiredModal({ open, onRelogin, onClose }: SessionExpiredModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
              <RefreshCw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-lg">Sessão Expirada</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Sua sessão expirou e não foi possível reconectar automaticamente.
            <br />
            <span className="text-muted-foreground">
              Para continuar enviando mensagens, faça login novamente.
            </span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
          <p className="text-amber-800 dark:text-amber-200">
            <strong>Por que isso acontece?</strong>
          </p>
          <ul className="mt-1 list-disc list-inside text-amber-700 dark:text-amber-300 text-xs space-y-0.5">
            <li>Você ficou inativo por um período prolongado</li>
            <li>Sua sessão expirou por segurança</li>
            <li>Houve uma atualização no sistema</li>
          </ul>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button 
            onClick={onRelogin}
            className="w-full sm:w-auto"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Fazer Login Novamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

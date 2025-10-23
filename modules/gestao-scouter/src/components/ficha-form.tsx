import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FichaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}

export function FichaForm({ open, onOpenChange, onSubmit }: FichaFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Nova Ficha</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar uma nova ficha.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <p>Formulário em desenvolvimento...</p>
          <Button onClick={onSubmit}>Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
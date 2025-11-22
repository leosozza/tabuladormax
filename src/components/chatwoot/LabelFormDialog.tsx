import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LabelColorPicker } from './LabelColorPicker';
import type { ConversationLabel } from '@/hooks/useConversationLabels';

interface LabelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, color: string) => Promise<void>;
  editingLabel?: ConversationLabel | null;
}

export function LabelFormDialog({ open, onOpenChange, onSubmit, editingLabel }: LabelFormDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingLabel) {
      setName(editingLabel.name);
      setColor(editingLabel.color);
    } else {
      setName('');
      setColor('#3b82f6');
    }
    setError('');
  }, [editingLabel, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Nome da etiqueta é obrigatório');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Nome deve ter pelo menos 2 caracteres');
      return;
    }

    if (trimmedName.length > 50) {
      setError('Nome deve ter no máximo 50 caracteres');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(trimmedName, color);
      onOpenChange(false);
    } catch (err) {
      console.error('Erro ao salvar etiqueta:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editingLabel ? 'Editar Etiqueta' : 'Nova Etiqueta'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="label-name">Nome da Etiqueta</Label>
              <Input
                id="label-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Urgente, Follow-up, etc."
                maxLength={50}
                autoFocus
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            <LabelColorPicker
              selectedColor={color}
              onColorChange={setColor}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

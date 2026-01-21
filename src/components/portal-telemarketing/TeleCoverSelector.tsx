import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { coverPatterns, CoverPattern, TeleCoverPattern } from './TeleCoverPatterns';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface TeleCoverSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentPattern: CoverPattern;
  onSelect: (pattern: CoverPattern) => void;
}

export const TeleCoverSelector = ({
  isOpen,
  onClose,
  currentPattern,
  onSelect
}: TeleCoverSelectorProps) => {
  const [selected, setSelected] = useState<CoverPattern>(currentPattern);

  const handleConfirm = () => {
    onSelect(selected);
    onClose();
  };

  const patterns = Object.entries(coverPatterns) as [CoverPattern, typeof coverPatterns[CoverPattern]][];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Escolher Capa</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-3 py-4">
          {patterns.map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={cn(
                "relative h-24 rounded-lg overflow-hidden border-2 transition-all bg-card",
                selected === key 
                  ? "border-primary ring-2 ring-primary/20" 
                  : "border-border hover:border-primary/50"
              )}
            >
              <TeleCoverPattern pattern={key} />
              
              {selected === key && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
              
              <span className="absolute bottom-2 left-2 text-xs font-medium text-muted-foreground">
                {label}
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} className="flex-1">
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

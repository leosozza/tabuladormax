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

const colorGroups = [
  { label: 'Teal', patterns: ['circles', 'lines', 'dots', 'waves', 'triangles', 'grid'] as CoverPattern[] },
  { label: 'Roxo', patterns: ['purple-circles', 'purple-waves'] as CoverPattern[] },
  { label: 'Verde', patterns: ['green-dots', 'green-lines'] as CoverPattern[] },
  { label: 'Azul', patterns: ['blue-triangles', 'blue-grid'] as CoverPattern[] },
];

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Escolher Capa</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {colorGroups.map((group) => (
            <div key={group.label}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">{group.label}</h3>
              <div className="grid grid-cols-2 gap-2">
                {group.patterns.map((key) => {
                  const { label } = coverPatterns[key];
                  return (
                    <button
                      key={key}
                      onClick={() => setSelected(key)}
                      className={cn(
                        "relative h-20 rounded-lg overflow-hidden border-2 transition-all bg-card",
                        selected === key 
                          ? "border-primary ring-2 ring-primary/20" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <TeleCoverPattern pattern={key} />
                      
                      {selected === key && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                      
                      <span className="absolute bottom-1 left-2 text-xs font-medium text-muted-foreground">
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
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

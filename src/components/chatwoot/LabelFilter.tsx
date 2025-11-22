import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Filter, X } from 'lucide-react';
import { useConversationLabels } from '@/hooks/useConversationLabels';
import { Badge } from '@/components/ui/badge';

interface LabelFilterProps {
  selectedLabelIds: string[];
  onSelectedLabelsChange: (labelIds: string[]) => void;
}

export function LabelFilter({ selectedLabelIds, onSelectedLabelsChange }: LabelFilterProps) {
  const [open, setOpen] = useState(false);
  const { labels } = useConversationLabels();

  const handleToggleLabel = (labelId: string) => {
    if (selectedLabelIds.includes(labelId)) {
      onSelectedLabelsChange(selectedLabelIds.filter((id) => id !== labelId));
    } else {
      onSelectedLabelsChange([...selectedLabelIds, labelId]);
    }
  };

  const clearFilters = () => {
    onSelectedLabelsChange([]);
  };

  const selectedLabels = labels.filter((l) => selectedLabelIds.includes(l.id));

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            Filtrar
            {selectedLabelIds.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-2 py-0">
                {selectedLabelIds.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filtrar por etiqueta</h4>
              {selectedLabelIds.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-auto p-1 text-xs"
                >
                  Limpar
                </Button>
              )}
            </div>

            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {labels.map((label) => {
                  const isSelected = selectedLabelIds.includes(label.id);
                  return (
                    <div
                      key={label.id}
                      className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md cursor-pointer transition-colors"
                      onClick={() => handleToggleLabel(label.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={() => handleToggleLabel(label.id)}
                      />
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="text-sm flex-1">{label.name}</span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>

      {/* Badges dos filtros ativos */}
      {selectedLabels.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {selectedLabels.map((label) => (
            <Badge
              key={label.id}
              variant="outline"
              className="gap-1 px-2 py-1"
              style={{
                borderColor: label.color,
                backgroundColor: `${label.color}15`,
                color: label.color,
              }}
            >
              {label.name}
              <button
                onClick={() => handleToggleLabel(label.id)}
                className="hover:bg-background/20 rounded-full p-0.5"
                type="button"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

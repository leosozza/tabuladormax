import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useConversationLabels } from '@/hooks/useConversationLabels';

interface LabelFilterProps {
  selectedLabelIds: string[];
  onSelectedLabelsChange: (labelIds: string[]) => void;
}

export function LabelFilter({ selectedLabelIds, onSelectedLabelsChange }: LabelFilterProps) {
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Filtrar por etiqueta</h4>
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
        <div className="space-y-1">
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
  );
}

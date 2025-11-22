import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Tag, Settings } from 'lucide-react';
import { useConversationLabels } from '@/hooks/useConversationLabels';
import { LabelBadge } from './LabelBadge';
import { LabelSettingsManager } from './LabelSettingsManager';

interface LabelManagerProps {
  conversationId: number;
}

export function LabelManager({ conversationId }: LabelManagerProps) {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { labels, assignedLabels, loading, toggleLabel } = useConversationLabels(conversationId);

  const handleToggleLabel = async (labelId: string) => {
    await toggleLabel(conversationId, labelId);
  };

  const isLabelAssigned = (labelId: string) => {
    return assignedLabels.some((a) => a.label_id === labelId);
  };

  return (
    <>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Tag className="w-4 h-4" />
          Etiquetas
          {assignedLabels.length > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
              {assignedLabels.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Gerenciar Etiquetas</h4>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setSettingsOpen(true);
              }}
              className="h-7 px-2"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
          
          <div>
            
            {/* Labels atualmente atribuídas */}
            {assignedLabels.length > 0 && (
              <div className="mb-4 pb-4 border-b">
                <p className="text-xs text-muted-foreground mb-2">Etiquetas atuais:</p>
                <div className="flex flex-wrap gap-2">
                  {assignedLabels.map((assignment) => {
                    const label = labels.find((l) => l.id === assignment.label_id);
                    if (!label) return null;
                    return (
                      <LabelBadge
                        key={assignment.id}
                        name={label.name}
                        color={label.color}
                        onRemove={() => handleToggleLabel(label.id)}
                        size="sm"
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lista de todas as labels disponíveis */}
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {labels.map((label) => {
                  const isAssigned = isLabelAssigned(label.id);
                  return (
                    <div
                      key={label.id}
                      className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md cursor-pointer transition-colors"
                      onClick={() => handleToggleLabel(label.id)}
                    >
                      <Checkbox
                        checked={isAssigned}
                        disabled={loading}
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
        </div>
      </PopoverContent>
    </Popover>

    <LabelSettingsManager
      open={settingsOpen}
      onOpenChange={setSettingsOpen}
    />
  </>
  );
}

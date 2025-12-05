import { Circle, CircleDot, Square, User, Cog, Diamond, FolderOpen, Database, StickyNote } from 'lucide-react';
import { BpmnNodeType, bpmnPaletteItems } from '@/types/bpmn';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BpmnNodePaletteProps {
  onAddNode?: (type: BpmnNodeType) => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Circle,
  CircleDot,
  Square,
  User,
  Cog,
  Diamond,
  FolderOpen,
  Database,
  StickyNote,
};

const categoryLabels: Record<string, string> = {
  eventos: '📋 Eventos',
  atividades: '📋 Atividades',
  gateways: '📋 Gateways',
  dados: '📋 Dados',
};

export function BpmnNodePalette({ onAddNode }: BpmnNodePaletteProps) {
  const handleDragStart = (event: React.DragEvent, type: BpmnNodeType) => {
    event.dataTransfer.setData('application/bpmn-node', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  const groupedItems = bpmnPaletteItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof bpmnPaletteItems>);

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h3 className="font-semibold text-sm text-foreground">Elementos BPMN</h3>
        <p className="text-xs text-muted-foreground mt-1">Arraste para o canvas</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">
                {categoryLabels[category]}
              </h4>
              <div className="space-y-1">
                {items.map((item) => {
                  const IconComponent = iconMap[item.icon];
                  return (
                    <div
                      key={item.type}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.type)}
                      onClick={() => onAddNode?.(item.type)}
                      className="flex items-center gap-3 p-2 rounded-md cursor-grab hover:bg-accent transition-colors active:cursor-grabbing"
                    >
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                        {IconComponent && <IconComponent className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

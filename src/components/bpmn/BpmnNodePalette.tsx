import { useState } from 'react';
import { Circle, CircleDot, Square, User, Cog, Diamond, FolderOpen, Database, StickyNote, X, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { BpmnNodeType, bpmnPaletteItems } from '@/types/bpmn';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface BpmnNodePaletteProps {
  onAddNode?: (type: BpmnNodeType) => void;
  onClose?: () => void;
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

const categoryConfig: Record<string, { label: string; icon: string; color: string }> = {
  eventos: { label: 'Eventos', icon: '⭕', color: 'bg-emerald-500/10 text-emerald-600' },
  atividades: { label: 'Atividades', icon: '📦', color: 'bg-blue-500/10 text-blue-600' },
  gateways: { label: 'Gateways', icon: '◇', color: 'bg-amber-500/10 text-amber-600' },
  dados: { label: 'Dados', icon: '🗄️', color: 'bg-purple-500/10 text-purple-600' },
};

export function BpmnNodePalette({ onAddNode, onClose }: BpmnNodePaletteProps) {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['eventos', 'atividades', 'gateways', 'dados']);

  const handleDragStart = (event: React.DragEvent, type: BpmnNodeType) => {
    event.dataTransfer.setData('application/bpmn-node', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const filteredItems = bpmnPaletteItems.filter(item =>
    item.label.toLowerCase().includes(search.toLowerCase()) ||
    item.description.toLowerCase().includes(search.toLowerCase())
  );

  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof bpmnPaletteItems>);

  return (
    <div className="w-72 bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl flex flex-col max-h-[calc(100vh-8rem)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div>
          <h3 className="font-semibold text-foreground">Elementos</h3>
          <p className="text-xs text-muted-foreground">Arraste para o canvas</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" className="h-8 w-8 rounded-lg" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar elementos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-muted/50 border-0 rounded-xl text-sm"
          />
        </div>
      </div>

      {/* Elements */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {Object.entries(groupedItems).map(([category, items]) => {
            const config = categoryConfig[category];
            const isExpanded = expandedCategories.includes(category);
            
            return (
              <Collapsible key={category} open={isExpanded} onOpenChange={() => toggleCategory(category)}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full p-2 rounded-xl hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-xs", config.color)}>
                        {config.icon}
                      </span>
                      <span className="text-sm font-medium text-foreground">{config.label}</span>
                      <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md">
                        {items.length}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid grid-cols-2 gap-2 pt-2 pb-1">
                    {items.map((item) => {
                      const IconComponent = iconMap[item.icon];
                      return (
                        <div
                          key={item.type}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item.type)}
                          onClick={() => onAddNode?.(item.type)}
                          className="group flex flex-col items-center gap-2 p-3 rounded-xl cursor-grab bg-muted/30 hover:bg-muted/60 border border-transparent hover:border-border/50 transition-all active:cursor-grabbing active:scale-95"
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                            config.color
                          )}>
                            {IconComponent && <IconComponent className="w-5 h-5" />}
                          </div>
                          <span className="text-xs font-medium text-foreground text-center leading-tight">
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer tip */}
      <div className="px-4 py-3 border-t border-border/50 bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          💡 Dica: Use <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Del</kbd> para excluir
        </p>
      </div>
    </div>
  );
}
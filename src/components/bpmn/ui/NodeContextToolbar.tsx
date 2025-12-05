import { memo } from 'react';
import { Node } from 'reactflow';
import { Palette, Type, Trash2, Copy, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ColorPicker } from './ColorPicker';
import { NodeColor } from '../edges/types';

interface NodeContextToolbarProps {
  node: Node;
  onDelete: () => void;
  onDuplicate: () => void;
  onColorChange: (color: NodeColor) => void;
  onShowQuickActions: () => void;
  className?: string;
}

export const NodeContextToolbar = memo(function NodeContextToolbar({
  node,
  onDelete,
  onDuplicate,
  onColorChange,
  onShowQuickActions,
  className,
}: NodeContextToolbarProps) {
  return (
    <div 
      className={cn(
        "flex items-center gap-1 p-1.5 rounded-xl",
        "bg-background/95 backdrop-blur-xl border border-border/50 shadow-lg",
        className
      )}
    >
      {/* Quick add */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 rounded-lg"
        onClick={onShowQuickActions}
      >
        <Plus className="w-4 h-4" />
      </Button>
      
      {/* Color picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 rounded-lg"
          >
            <Palette className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Cor do elemento</span>
            <ColorPicker 
              value={node.data?.color || 'blue'} 
              onChange={onColorChange} 
            />
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Duplicate */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 rounded-lg"
        onClick={onDuplicate}
      >
        <Copy className="w-4 h-4" />
      </Button>
      
      {/* Delete */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={onDelete}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
});

export default NodeContextToolbar;

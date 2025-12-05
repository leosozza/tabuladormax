import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';

const TextBoxNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div className="flex flex-col items-center group">
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-border !-top-1.5 !bg-background"
      />
      <div 
        className={cn(
          "min-w-[100px] min-h-[40px] px-4 py-3 rounded-lg transition-all duration-200",
          "bg-background border-2 border-dashed border-border/70",
          "flex items-center justify-center",
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary",
          !selected && "group-hover:border-primary/50"
        )}
      >
        <span className="text-sm text-foreground font-medium">
          {data.label || 'Texto'}
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !border-border !-bottom-1.5 !bg-background"
      />
    </div>
  );
});

TextBoxNode.displayName = 'TextBoxNode';

export default TextBoxNode;

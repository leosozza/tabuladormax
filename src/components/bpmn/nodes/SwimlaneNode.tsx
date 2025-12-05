import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { NodeColor, NODE_COLORS } from '../edges/types';

const SwimlaneNode = memo(({ data, selected }: NodeProps) => {
  const nodeColor: NodeColor = data.color || 'blue';
  const colorConfig = NODE_COLORS[nodeColor] || NODE_COLORS.blue;

  return (
    <div className="flex group">
      <Handle
        type="target"
        position={Position.Left}
        className={cn(
          "!w-3 !h-3 !border-2 !border-white !-left-1.5",
          colorConfig.handle
        )}
      />
      {/* Header vertical */}
      <div 
        className={cn(
          "w-8 min-h-[200px] rounded-l-xl flex items-center justify-center transition-all duration-200",
          "bg-gradient-to-b border-2 border-r-0 border-white",
          colorConfig.gradient,
          colorConfig.shadow,
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        )}
      >
        <span 
          className="text-white text-xs font-semibold whitespace-nowrap"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          {data.label || 'Raia'}
        </span>
      </div>
      {/* Content area */}
      <div 
        className={cn(
          "flex-1 min-w-[300px] min-h-[200px] rounded-r-xl transition-all duration-200",
          "bg-background/50 border-2 border-l-0 border-border/50",
          selected && "border-primary/50",
          !selected && "group-hover:border-primary/30"
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          "!w-3 !h-3 !border-2 !border-white !-right-1.5",
          colorConfig.handle
        )}
      />
    </div>
  );
});

SwimlaneNode.displayName = 'SwimlaneNode';

export default SwimlaneNode;

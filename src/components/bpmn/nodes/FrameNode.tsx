import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { NodeColor, NODE_COLORS } from '../edges/types';

const FrameNode = memo(({ data, selected }: NodeProps) => {
  const nodeColor: NodeColor = data.color || 'purple';
  const colorConfig = NODE_COLORS[nodeColor] || NODE_COLORS.purple;

  return (
    <div className="flex flex-col group">
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          "!w-3 !h-3 !border-2 !border-white !-top-1.5",
          colorConfig.handle
        )}
      />
      {/* Header */}
      <div 
        className={cn(
          "px-4 py-2 rounded-t-xl flex items-center gap-2 transition-all duration-200",
          "bg-gradient-to-r border-2 border-b-0 border-white",
          colorConfig.gradient,
          colorConfig.shadow,
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        )}
      >
        <span className="text-white text-sm font-semibold">
          {data.label || 'Frame'}
        </span>
      </div>
      {/* Content area */}
      <div 
        className={cn(
          "min-w-[250px] min-h-[150px] rounded-b-xl rounded-tr-xl transition-all duration-200",
          "bg-background/30 border-2 border-t-0 border-border/50",
          selected && "border-primary/50",
          !selected && "group-hover:border-primary/30"
        )}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          "!w-3 !h-3 !border-2 !border-white !-bottom-1.5",
          colorConfig.handle
        )}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className={cn(
          "!w-3 !h-3 !border-2 !border-white !-left-1.5",
          colorConfig.handle
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={cn(
          "!w-3 !h-3 !border-2 !border-white !-right-1.5",
          colorConfig.handle
        )}
      />
    </div>
  );
});

FrameNode.displayName = 'FrameNode';

export default FrameNode;

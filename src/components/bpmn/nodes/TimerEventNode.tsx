import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NodeColor, NODE_COLORS } from '../edges/types';

const TimerEventNode = memo(({ data, selected }: NodeProps) => {
  const nodeColor: NodeColor = data.color || 'orange';
  const colorConfig = NODE_COLORS[nodeColor] || NODE_COLORS.orange;

  return (
    <div className="flex flex-col items-center group">
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          "!w-3 !h-3 !border-2 !border-white !-top-1.5",
          colorConfig.handle
        )}
      />
      <div 
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200",
          "bg-gradient-to-br border-2 border-white",
          colorConfig.gradient,
          colorConfig.shadow,
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110",
          !selected && "group-hover:scale-105 group-hover:shadow-xl"
        )}
      >
        <Timer className="w-6 h-6 text-white" />
      </div>
      <div className={cn(
        "mt-2 px-3 py-1 rounded-lg text-xs font-medium transition-all",
        "bg-background/90 backdrop-blur-sm border border-border/50 shadow-sm",
        selected && "bg-primary text-primary-foreground border-primary"
      )}>
        {data.label || 'Timer'}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          "!w-3 !h-3 !border-2 !border-white !-bottom-1.5",
          colorConfig.handle
        )}
      />
    </div>
  );
});

TimerEventNode.displayName = 'TimerEventNode';

export default TimerEventNode;

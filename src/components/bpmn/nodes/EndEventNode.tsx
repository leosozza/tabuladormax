import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NodeColor, NODE_COLORS } from '../edges/types';

const EndEventNode = memo(({ data, selected }: NodeProps) => {
  const nodeColor: NodeColor = data.color || 'red';
  const colorConfig = NODE_COLORS[nodeColor] || NODE_COLORS.red;

  return (
    <div className="flex flex-col items-center group">
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          "!w-3 !h-3 !border-2 !border-white dark:!border-rose-300 !-top-1.5",
          colorConfig.handle
        )}
      />
      <div 
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200",
          "bg-gradient-to-br",
          colorConfig.gradient,
          colorConfig.shadow,
          "border-2 border-white dark:border-rose-300",
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110",
          !selected && "group-hover:scale-105 group-hover:shadow-xl"
        )}
      >
        <Square className="w-5 h-5 text-white fill-white" />
      </div>
      <div className={cn(
        "mt-2 px-3 py-1 rounded-lg text-xs font-medium transition-all",
        "bg-background/90 backdrop-blur-sm border border-border/50 shadow-sm",
        selected && "bg-primary text-primary-foreground border-primary"
      )}>
        {data.label || 'Fim'}
      </div>
    </div>
  );
});

EndEventNode.displayName = 'EndEventNode';

export default EndEventNode;

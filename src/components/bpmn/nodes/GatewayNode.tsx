import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { X, Plus, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NodeColor, NODE_COLORS } from '../edges/types';

const GatewayNode = memo(({ data, selected }: NodeProps) => {
  const gatewayType = data.config?.gatewayType || 'exclusive';
  const nodeColor: NodeColor = data.color || 'yellow';
  const colorConfig = NODE_COLORS[nodeColor] || NODE_COLORS.yellow;
  
  const getIcon = () => {
    switch (gatewayType) {
      case 'parallel':
        return Plus;
      case 'inclusive':
        return Circle;
      default:
        return X;
    }
  };

  const IconComponent = getIcon();

  return (
    <div className="flex flex-col items-center group">
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          "!w-3 !h-3 !border-2 !border-white dark:!border-amber-300 !-top-1.5",
          colorConfig.handle
        )}
      />
      <div 
        className={cn(
          "w-14 h-14 rotate-45 flex items-center justify-center transition-all duration-200",
          "bg-gradient-to-br",
          colorConfig.gradient,
          colorConfig.shadow,
          "border-2 border-white dark:border-amber-300",
          "rounded-xl",
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110",
          !selected && "group-hover:scale-105 group-hover:shadow-xl"
        )}
      >
        <div className="-rotate-45">
          <IconComponent className={cn(
            "text-white",
            gatewayType === 'inclusive' ? "w-4 h-4" : "w-6 h-6"
          )} />
        </div>
      </div>
      <div className={cn(
        "mt-2 px-3 py-1 rounded-lg text-xs font-medium transition-all",
        "bg-background/90 backdrop-blur-sm border border-border/50 shadow-sm",
        selected && "bg-primary text-primary-foreground border-primary"
      )}>
        {data.label || 'Gateway'}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          "!w-3 !h-3 !border-2 !border-white dark:!border-amber-300 !-bottom-1.5",
          colorConfig.handle
        )}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className={cn(
          "!w-3 !h-3 !border-2 !border-white dark:!border-amber-300 !-left-1.5",
          colorConfig.handle
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={cn(
          "!w-3 !h-3 !border-2 !border-white dark:!border-amber-300 !-right-1.5",
          colorConfig.handle
        )}
      />
    </div>
  );
});

GatewayNode.displayName = 'GatewayNode';

export default GatewayNode;

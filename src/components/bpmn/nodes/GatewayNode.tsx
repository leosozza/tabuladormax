import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { X, Plus, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

const GatewayNode = memo(({ data, selected }: NodeProps) => {
  const gatewayType = data.config?.gatewayType || 'exclusive';
  
  const getConfig = () => {
    switch (gatewayType) {
      case 'parallel':
        return { icon: Plus, label: 'AND' };
      case 'inclusive':
        return { icon: Circle, label: 'OR' };
      default:
        return { icon: X, label: 'XOR' };
    }
  };

  const config = getConfig();
  const IconComponent = config.icon;

  return (
    <div className="flex flex-col items-center group">
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white dark:!border-amber-300 !-top-1.5"
      />
      <div 
        className={cn(
          "w-14 h-14 rotate-45 flex items-center justify-center transition-all duration-200",
          "bg-gradient-to-br from-amber-400 to-amber-600",
          "shadow-lg shadow-amber-500/25",
          "border-2 border-white dark:border-amber-300",
          "rounded-xl",
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110",
          !selected && "group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-amber-500/30"
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
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white dark:!border-amber-300 !-bottom-1.5"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white dark:!border-amber-300 !-left-1.5"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white dark:!border-amber-300 !-right-1.5"
      />
    </div>
  );
});

GatewayNode.displayName = 'GatewayNode';

export default GatewayNode;
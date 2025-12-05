import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { X, Plus, Circle } from 'lucide-react';

const GatewayNode = memo(({ data, selected }: NodeProps) => {
  const gatewayType = data.config?.gatewayType || 'exclusive';
  
  const getIcon = () => {
    switch (gatewayType) {
      case 'parallel':
        return <Plus className="w-5 h-5 text-amber-600" />;
      case 'inclusive':
        return <Circle className="w-4 h-4 text-amber-600" />;
      default:
        return <X className="w-5 h-5 text-amber-600" />;
    }
  };

  return (
    <div 
      className={`flex flex-col items-center ${selected ? 'ring-2 ring-primary ring-offset-2 rounded-lg' : ''}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-amber-500"
      />
      <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 border-2 border-amber-500 rotate-45 flex items-center justify-center">
        <div className="-rotate-45">
          {getIcon()}
        </div>
      </div>
      <span className="mt-2 text-xs font-medium text-foreground">{data.label || 'Gateway'}</span>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-amber-500"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="w-3 h-3 !bg-amber-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="w-3 h-3 !bg-amber-500"
      />
    </div>
  );
});

GatewayNode.displayName = 'GatewayNode';

export default GatewayNode;

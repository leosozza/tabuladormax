import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Circle } from 'lucide-react';

const StartEventNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div 
      className={`flex flex-col items-center ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
    >
      <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 border-2 border-green-500 flex items-center justify-center">
        <Circle className="w-6 h-6 text-green-600 dark:text-green-400" />
      </div>
      <span className="mt-1 text-xs font-medium text-foreground">{data.label || 'Início'}</span>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-green-500"
      />
    </div>
  );
});

StartEventNode.displayName = 'StartEventNode';

export default StartEventNode;

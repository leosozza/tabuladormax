import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { CircleDot } from 'lucide-react';

const EndEventNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div 
      className={`flex flex-col items-center ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-red-500"
      />
      <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 border-4 border-red-500 flex items-center justify-center">
        <CircleDot className="w-5 h-5 text-red-600 dark:text-red-400" />
      </div>
      <span className="mt-1 text-xs font-medium text-foreground">{data.label || 'Fim'}</span>
    </div>
  );
});

EndEventNode.displayName = 'EndEventNode';

export default EndEventNode;

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Database } from 'lucide-react';

const DataStoreNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div 
      className={`flex flex-col items-center ${selected ? 'ring-2 ring-primary ring-offset-2 rounded' : ''}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-cyan-500"
      />
      <div className="w-16 h-14 bg-cyan-100 dark:bg-cyan-900/50 border-2 border-cyan-500 rounded-b-lg flex items-center justify-center relative">
        <div className="absolute -top-1 left-0 right-0 h-3 bg-cyan-100 dark:bg-cyan-900/50 border-2 border-cyan-500 border-b-0 rounded-t-full" />
        <Database className="w-6 h-6 text-cyan-600 dark:text-cyan-400 mt-1" />
      </div>
      <span className="mt-1 text-xs font-medium text-foreground">{data.label || 'Banco de Dados'}</span>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-cyan-500"
      />
    </div>
  );
});

DataStoreNode.displayName = 'DataStoreNode';

export default DataStoreNode;

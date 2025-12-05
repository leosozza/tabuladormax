import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Database } from 'lucide-react';
import { cn } from '@/lib/utils';

const DataStoreNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div className="flex flex-col items-center group">
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white dark:!border-purple-300 !-top-1.5"
      />
      <div 
        className={cn(
          "w-16 h-14 flex items-center justify-center transition-all duration-200 relative",
          "bg-gradient-to-b from-purple-400 to-purple-600",
          "shadow-lg shadow-purple-500/25",
          "rounded-t-lg rounded-b-[100%]",
          "border-2 border-white dark:border-purple-300",
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110",
          !selected && "group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-purple-500/30"
        )}
      >
        {/* Top ellipse effect */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-purple-300/50 rounded-t-lg" />
        <Database className="w-6 h-6 text-white mt-1" />
      </div>
      <div className={cn(
        "mt-2 px-3 py-1 rounded-lg text-xs font-medium transition-all",
        "bg-background/90 backdrop-blur-sm border border-border/50 shadow-sm",
        selected && "bg-primary text-primary-foreground border-primary"
      )}>
        {data.label || 'Banco de Dados'}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white dark:!border-purple-300 !-bottom-1.5"
      />
    </div>
  );
});

DataStoreNode.displayName = 'DataStoreNode';

export default DataStoreNode;
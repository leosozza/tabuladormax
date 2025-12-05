import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FolderOpen, Plus } from 'lucide-react';

const SubprocessNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div 
      className={`min-w-[140px] ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-indigo-500"
      />
      <div className="px-4 py-3 bg-card rounded-lg border-2 border-indigo-500 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <FolderOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs text-muted-foreground">Subprocesso</span>
        </div>
        <p className="text-sm font-medium text-foreground">{data.label || 'Subprocesso'}</p>
        {data.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{data.description}</p>
        )}
        <div className="flex justify-center mt-2">
          <div className="w-5 h-5 border border-indigo-400 rounded flex items-center justify-center">
            <Plus className="w-3 h-3 text-indigo-500" />
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-indigo-500"
      />
    </div>
  );
});

SubprocessNode.displayName = 'SubprocessNode';

export default SubprocessNode;

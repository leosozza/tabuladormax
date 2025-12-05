import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FolderOpen, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const SubprocessNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div className="group">
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-white dark:!border-cyan-300 !-top-1.5"
      />
      <div 
        className={cn(
          "min-w-[180px] rounded-2xl transition-all duration-200",
          "bg-background border-2 border-dashed border-cyan-400/70",
          "shadow-lg shadow-cyan-500/10",
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 border-primary/50 border-solid",
          !selected && "group-hover:scale-[1.02] group-hover:shadow-xl group-hover:border-cyan-400"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-gradient-to-r from-cyan-500/10 to-transparent rounded-t-xl">
          <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center">
            <FolderOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Subprocesso
            </span>
            <p className="text-sm font-semibold text-foreground leading-tight">
              {data.label || 'Subprocesso'}
            </p>
          </div>
        </div>
        
        {/* Content area */}
        <div className="p-4 min-h-[60px] flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Plus className="w-4 h-4" />
            <span className="text-xs">Clique para expandir</span>
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-white dark:!border-cyan-300 !-bottom-1.5"
      />
    </div>
  );
});

SubprocessNode.displayName = 'SubprocessNode';

export default SubprocessNode;
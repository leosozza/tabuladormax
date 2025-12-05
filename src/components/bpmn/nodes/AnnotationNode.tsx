import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';

const AnnotationNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div className="group">
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white dark:!border-slate-300 !-left-1.5"
      />
      <div 
        className={cn(
          "min-w-[140px] max-w-[220px] transition-all duration-200",
          "bg-amber-50 dark:bg-amber-950/30",
          "border-l-4 border-amber-400",
          "rounded-r-xl",
          "shadow-lg shadow-amber-500/10",
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105",
          !selected && "group-hover:scale-[1.02] group-hover:shadow-xl"
        )}
      >
        <div className="p-3">
          <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
            {data.label || 'Adicione uma nota...'}
          </p>
        </div>
      </div>
    </div>
  );
});

AnnotationNode.displayName = 'AnnotationNode';

export default AnnotationNode;
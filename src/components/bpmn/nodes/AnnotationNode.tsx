import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { StickyNote } from 'lucide-react';

const AnnotationNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div 
      className={`min-w-[100px] ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-2 h-2 !bg-gray-400"
      />
      <div className="px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 rounded-r shadow-sm">
        <div className="flex items-center gap-1 mb-1">
          <StickyNote className="w-3 h-3 text-yellow-600" />
          <span className="text-[10px] text-yellow-700 dark:text-yellow-400">Nota</span>
        </div>
        <p className="text-xs text-foreground">{data.label || 'Anotação'}</p>
        {data.description && (
          <p className="text-[10px] text-muted-foreground mt-1">{data.description}</p>
        )}
      </div>
    </div>
  );
});

AnnotationNode.displayName = 'AnnotationNode';

export default AnnotationNode;

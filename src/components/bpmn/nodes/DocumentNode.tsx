import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NodeColor, NODE_COLORS } from '../edges/types';

const DocumentNode = memo(({ data, selected }: NodeProps) => {
  const nodeColor: NodeColor = data.color || 'gray';
  const colorConfig = NODE_COLORS[nodeColor] || NODE_COLORS.gray;

  return (
    <div className="flex flex-col items-center group">
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          "!w-3 !h-3 !border-2 !border-white !-top-1.5",
          colorConfig.handle
        )}
      />
      <div 
        className={cn(
          "w-16 h-20 rounded-lg flex items-center justify-center transition-all duration-200",
          "bg-gradient-to-br border-2 border-white relative",
          colorConfig.gradient,
          colorConfig.shadow,
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110",
          !selected && "group-hover:scale-105 group-hover:shadow-xl"
        )}
      >
        {/* Document fold corner */}
        <div className="absolute top-0 right-0 w-4 h-4 bg-white/30 rounded-bl-lg" />
        <FileText className="w-7 h-7 text-white" />
      </div>
      <div className={cn(
        "mt-2 px-3 py-1 rounded-lg text-xs font-medium transition-all",
        "bg-background/90 backdrop-blur-sm border border-border/50 shadow-sm",
        selected && "bg-primary text-primary-foreground border-primary"
      )}>
        {data.label || 'Documento'}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          "!w-3 !h-3 !border-2 !border-white !-bottom-1.5",
          colorConfig.handle
        )}
      />
    </div>
  );
});

DocumentNode.displayName = 'DocumentNode';

export default DocumentNode;

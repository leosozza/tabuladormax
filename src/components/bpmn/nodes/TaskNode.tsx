import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Square, User, Cog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NodeColor, NODE_COLORS } from '../edges/types';

const TaskNode = memo(({ data, selected }: NodeProps) => {
  const taskType = data.type || 'task';
  const nodeColor: NodeColor = data.color || 'blue';
  const colorConfig = NODE_COLORS[nodeColor] || NODE_COLORS.blue;
  
  const getIcon = () => {
    switch (taskType) {
      case 'userTask':
        return User;
      case 'serviceTask':
        return Cog;
      default:
        return Square;
    }
  };

  const getLabel = () => {
    switch (taskType) {
      case 'userTask':
        return 'Manual';
      case 'serviceTask':
        return 'Auto';
      default:
        return 'Tarefa';
    }
  };

  const IconComponent = getIcon();

  return (
    <div className="group">
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          "!w-3 !h-3 !border-2 !border-white dark:!border-slate-300 !-top-1.5",
          colorConfig.handle
        )}
      />
      <div 
        className={cn(
          "min-w-[160px] rounded-2xl transition-all duration-200",
          "bg-background border-2 border-border/50",
          "shadow-lg",
          colorConfig.shadow,
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 border-primary/50",
          !selected && "group-hover:scale-[1.02] group-hover:shadow-xl group-hover:border-border"
        )}
      >
        {/* Header bar with color */}
        <div className={cn(
          "h-2 rounded-t-xl bg-gradient-to-r",
          colorConfig.gradient
        )} />
        
        {/* Content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
              colorConfig.iconBg
            )}>
              <IconComponent className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {getLabel()}
              </span>
              <p className="text-sm font-semibold text-foreground mt-0.5 leading-tight">
                {data.label || 'Tarefa'}
              </p>
              {data.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {data.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          "!w-3 !h-3 !border-2 !border-white dark:!border-slate-300 !-bottom-1.5",
          colorConfig.handle
        )}
      />
    </div>
  );
});

TaskNode.displayName = 'TaskNode';

export default TaskNode;

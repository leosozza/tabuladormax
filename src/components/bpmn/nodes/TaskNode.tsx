import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Square, User, Cog } from 'lucide-react';
import { cn } from '@/lib/utils';

const TaskNode = memo(({ data, selected }: NodeProps) => {
  const taskType = data.type || 'task';
  
  const getConfig = () => {
    switch (taskType) {
      case 'userTask':
        return {
          icon: User,
          label: 'Manual',
          gradient: 'from-blue-400 to-blue-600',
          shadow: 'shadow-blue-500/20',
          iconBg: 'bg-blue-500',
        };
      case 'serviceTask':
        return {
          icon: Cog,
          label: 'Auto',
          gradient: 'from-violet-400 to-violet-600',
          shadow: 'shadow-violet-500/20',
          iconBg: 'bg-violet-500',
        };
      default:
        return {
          icon: Square,
          label: 'Tarefa',
          gradient: 'from-slate-400 to-slate-600',
          shadow: 'shadow-slate-500/20',
          iconBg: 'bg-slate-500',
        };
    }
  };

  const config = getConfig();
  const IconComponent = config.icon;

  return (
    <div className="group">
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white dark:!border-slate-300 !-top-1.5"
      />
      <div 
        className={cn(
          "min-w-[160px] rounded-2xl transition-all duration-200",
          "bg-background border-2 border-border/50",
          "shadow-lg",
          config.shadow,
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 border-primary/50",
          !selected && "group-hover:scale-[1.02] group-hover:shadow-xl group-hover:border-border"
        )}
      >
        {/* Header bar */}
        <div className={cn(
          "h-2 rounded-t-xl bg-gradient-to-r",
          config.gradient
        )} />
        
        {/* Content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
              config.iconBg
            )}>
              <IconComponent className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {config.label}
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
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white dark:!border-slate-300 !-bottom-1.5"
      />
    </div>
  );
});

TaskNode.displayName = 'TaskNode';

export default TaskNode;
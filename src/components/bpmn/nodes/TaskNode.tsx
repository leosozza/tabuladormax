import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Square, User, Cog } from 'lucide-react';

const TaskNode = memo(({ data, selected }: NodeProps) => {
  const taskType = data.type || 'task';
  
  const getIcon = () => {
    switch (taskType) {
      case 'userTask':
        return <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'serviceTask':
        return <Cog className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      default:
        return <Square className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getBorderColor = () => {
    switch (taskType) {
      case 'userTask':
        return 'border-blue-500';
      case 'serviceTask':
        return 'border-purple-500';
      default:
        return 'border-gray-400';
    }
  };

  return (
    <div 
      className={`min-w-[120px] ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-gray-500"
      />
      <div className={`px-4 py-3 bg-card rounded-lg border-2 ${getBorderColor()} shadow-sm`}>
        <div className="flex items-center gap-2 mb-1">
          {getIcon()}
          <span className="text-xs text-muted-foreground">
            {taskType === 'userTask' ? 'Manual' : taskType === 'serviceTask' ? 'Auto' : 'Tarefa'}
          </span>
        </div>
        <p className="text-sm font-medium text-foreground">{data.label || 'Tarefa'}</p>
        {data.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{data.description}</p>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-gray-500"
      />
    </div>
  );
});

TaskNode.displayName = 'TaskNode';

export default TaskNode;

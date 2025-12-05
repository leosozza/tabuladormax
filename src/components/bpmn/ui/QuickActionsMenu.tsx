import { memo, useState } from 'react';
import { Node } from 'reactflow';
import { 
  Play, Square, CheckSquare, GitBranch, 
  Circle, ArrowRight, Plus, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BpmnNodeType } from '@/types/bpmn';

interface QuickActionsMenuProps {
  node: Node;
  onAddNode: (type: BpmnNodeType, sourceNode: Node) => void;
  onClose: () => void;
}

interface QuickAction {
  type: BpmnNodeType;
  icon: typeof Play;
  label: string;
  color: string;
  position: { x: number; y: number };
}

const ACTIONS: QuickAction[] = [
  { 
    type: 'task', 
    icon: CheckSquare, 
    label: 'Tarefa',
    color: 'bg-blue-500 hover:bg-blue-600',
    position: { x: 70, y: 0 }
  },
  { 
    type: 'gateway', 
    icon: GitBranch, 
    label: 'Decisão',
    color: 'bg-amber-500 hover:bg-amber-600',
    position: { x: 50, y: -50 }
  },
  { 
    type: 'endEvent', 
    icon: Square, 
    label: 'Fim',
    color: 'bg-rose-500 hover:bg-rose-600',
    position: { x: 50, y: 50 }
  },
  { 
    type: 'userTask', 
    icon: Circle, 
    label: 'Manual',
    color: 'bg-violet-500 hover:bg-violet-600',
    position: { x: 0, y: -70 }
  },
  { 
    type: 'serviceTask', 
    icon: ArrowRight, 
    label: 'Auto',
    color: 'bg-teal-500 hover:bg-teal-600',
    position: { x: 0, y: 70 }
  },
];

export const QuickActionsMenu = memo(function QuickActionsMenu({
  node,
  onAddNode,
  onClose,
}: QuickActionsMenuProps) {
  const [hoveredAction, setHoveredAction] = useState<BpmnNodeType | null>(null);
  
  return (
    <div className="relative w-[180px] h-[180px]">
      {/* Center circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <button
          onClick={onClose}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            "bg-background border-2 border-border shadow-lg",
            "hover:bg-muted transition-all hover:scale-110"
          )}
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      
      {/* Action buttons arranged in circle */}
      {ACTIONS.map((action) => {
        const IconComponent = action.icon;
        const isHovered = hoveredAction === action.type;
        
        return (
          <div
            key={action.type}
            className="absolute transition-all duration-200"
            style={{
              left: `calc(50% + ${action.position.x}px)`,
              top: `calc(50% + ${action.position.y}px)`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <button
              onClick={() => onAddNode(action.type, node)}
              onMouseEnter={() => setHoveredAction(action.type)}
              onMouseLeave={() => setHoveredAction(null)}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shadow-lg",
                "transition-all duration-200 border-2 border-white",
                action.color,
                isHovered && "scale-125 shadow-xl"
              )}
            >
              <IconComponent className="w-4 h-4 text-white" />
            </button>
            
            {/* Label tooltip */}
            {isHovered && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap">
                <span className="px-2 py-1 text-xs font-medium bg-background border border-border rounded shadow-sm">
                  {action.label}
                </span>
              </div>
            )}
          </div>
        );
      })}
      
      {/* Connecting lines (decorative) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {ACTIONS.map((action) => (
          <line
            key={action.type}
            x1="50%"
            y1="50%"
            x2={`calc(50% + ${action.position.x}px)`}
            y2={`calc(50% + ${action.position.y}px)`}
            stroke="hsl(var(--border))"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity={0.5}
          />
        ))}
      </svg>
    </div>
  );
});

export default QuickActionsMenu;

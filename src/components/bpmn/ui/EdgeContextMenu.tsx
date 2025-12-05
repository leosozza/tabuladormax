import { useEffect, useRef, useState } from 'react';
import { Edge } from 'reactflow';
import { EdgeRoutingMode, SmartEdgeData } from '../edges/types';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  CornerDownRight, 
  Spline, 
  PenTool, 
  Trash2,
  Eraser,
  Check
} from 'lucide-react';

interface EdgeContextMenuProps {
  edge: Edge;
  position: { x: number; y: number };
  onClose: () => void;
  onUpdateLabel: (label: string) => void;
  onUpdateRoutingMode: (mode: EdgeRoutingMode) => void;
  onDelete: () => void;
  onClearWaypoints: () => void;
}

const routingModes: { mode: EdgeRoutingMode; icon: React.ReactNode; label: string }[] = [
  { mode: 'straight', icon: <ArrowRight className="w-4 h-4" />, label: 'Reta' },
  { mode: 'orthogonal', icon: <CornerDownRight className="w-4 h-4" />, label: 'Ortogonal' },
  { mode: 'smooth', icon: <Spline className="w-4 h-4" />, label: 'Curva' },
  { mode: 'freeform', icon: <PenTool className="w-4 h-4" />, label: 'Livre' },
];

export function EdgeContextMenu({
  edge,
  position,
  onClose,
  onUpdateLabel,
  onUpdateRoutingMode,
  onDelete,
  onClearWaypoints,
}: EdgeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState(edge.data?.label || '');
  
  const edgeData = edge.data as SmartEdgeData | undefined;
  const currentMode = edgeData?.routingMode || 'orthogonal';
  const waypointsCount = edgeData?.waypoints?.length || 0;

  // Focus input on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Close on click outside or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 220),
    y: Math.min(position.y, window.innerHeight - 320),
  };

  const handleLabelChange = (newLabel: string) => {
    setLabel(newLabel);
    onUpdateLabel(newLabel);
  };

  const handleQuickLabel = (quickLabel: string) => {
    setLabel(quickLabel);
    onUpdateLabel(quickLabel);
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-popover border border-border rounded-lg shadow-xl min-w-[200px] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {/* Tipo de linha */}
      <div className="p-2 border-b border-border">
        <span className="text-[10px] uppercase font-medium text-muted-foreground px-1">
          Tipo de linha
        </span>
        <div className="grid grid-cols-4 gap-1 mt-1.5">
          {routingModes.map(({ mode, icon, label: modeLabel }) => (
            <Button
              key={mode}
              variant={currentMode === mode ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 w-full relative"
              onClick={() => onUpdateRoutingMode(mode)}
              title={modeLabel}
            >
              {icon}
              {currentMode === mode && (
                <Check className="w-2.5 h-2.5 absolute top-0.5 right-0.5 text-primary" />
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Texto */}
      <div className="p-2 border-b border-border">
        <span className="text-[10px] uppercase font-medium text-muted-foreground px-1">
          Texto
        </span>
        <input
          ref={inputRef}
          type="text"
          value={label}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="Adicionar texto..."
          className="h-8 px-2 mt-1.5 text-sm border border-border rounded-md bg-background text-foreground w-full focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="flex items-center gap-1 mt-1.5">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => handleQuickLabel('Sim')}
          >
            Sim
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => handleQuickLabel('Não')}
          >
            Não
          </Button>
          {label && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => handleLabelChange('')}
              title="Limpar texto"
            >
              <Eraser className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="p-1.5">
        {waypointsCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 text-xs gap-2"
            onClick={() => {
              onClearWaypoints();
            }}
          >
            <Eraser className="w-3.5 h-3.5" />
            Limpar pontos ({waypointsCount})
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-8 text-xs gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => {
            onDelete();
            onClose();
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Excluir conexão
        </Button>
      </div>
    </div>
  );
}

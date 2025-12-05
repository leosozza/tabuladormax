import { memo, useState, useCallback, useEffect } from 'react';
import {
  EdgeProps,
  EdgeLabelRenderer,
  useReactFlow,
} from 'reactflow';
import { SimpleEdgeData } from './types';

interface SimpleEdgeProps extends EdgeProps<SimpleEdgeData> {}

export const SimpleEdge = memo(function SimpleEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  markerEnd,
  data,
  selected,
}: SimpleEdgeProps) {
  const { setEdges, screenToFlowPosition } = useReactFlow();
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingLabel, setIsDraggingLabel] = useState(false);
  
  const isStraight = data?.routingMode === 'straight';
  const controlPoint = data?.controlPoint;
  const labelPosition = data?.labelPosition;
  
  // Calculate midpoint for label
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  
  // If curved and has control point, calculate label position on curve
  let labelX = labelPosition?.x ?? midX;
  let labelY = labelPosition?.y ?? midY;
  
  if (!labelPosition && controlPoint && !isStraight) {
    // Point at t=0.5 on quadratic bezier
    labelX = 0.25 * sourceX + 0.5 * controlPoint.x + 0.25 * targetX;
    labelY = 0.25 * sourceY + 0.5 * controlPoint.y + 0.25 * targetY;
  }
  
  // Generate path
  let edgePath: string;
  
  if (isStraight || !controlPoint) {
    // Straight line
    edgePath = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  } else {
    // Quadratic bezier curve
    edgePath = `M ${sourceX} ${sourceY} Q ${controlPoint.x} ${controlPoint.y} ${targetX} ${targetY}`;
  }
  
  // Handle drag start on path
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    if (isStraight) return; // Can't drag straight lines
    
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
  }, [isStraight]);
  
  // Handle label drag
  const handleLabelMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingLabel(true);
  }, []);
  
  // Double click to reset curve
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === id
          ? { ...edge, data: { ...edge.data, controlPoint: undefined } }
          : edge
      )
    );
  }, [id, setEdges]);
  
  // Global mouse move/up for dragging
  useEffect(() => {
    if (!isDragging && !isDraggingLabel) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      // Use ReactFlow's screenToFlowPosition for correct coordinates
      const position = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });
      
      if (isDragging) {
        setEdges((eds) =>
          eds.map((edge) =>
            edge.id === id
              ? { ...edge, data: { ...edge.data, controlPoint: position } }
              : edge
          )
        );
      }
      
      if (isDraggingLabel) {
        setEdges((eds) =>
          eds.map((edge) =>
            edge.id === id
              ? { ...edge, data: { ...edge.data, labelPosition: position } }
              : edge
          )
        );
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setIsDraggingLabel(false);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isDraggingLabel, id, setEdges, screenToFlowPosition]);
  
  const strokeColor = selected 
    ? 'hsl(var(--primary))' 
    : 'hsl(var(--muted-foreground))';
  
  const canDrag = selected && !isStraight;
  
  return (
    <>
      {/* Main edge path */}
      <path
        id={id}
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: strokeColor,
          transition: isDragging ? 'none' : 'stroke 0.15s, stroke-width 0.15s',
          fill: 'none',
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      
      {/* Invisible wider path for easier interaction */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className={`react-flow__edge-interaction ${canDrag ? 'cursor-move' : 'cursor-pointer'}`}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      />
      
      {/* Visual indicator when dragging is possible */}
      {canDrag && !isDragging && (
        <circle
          cx={controlPoint?.x ?? midX}
          cy={controlPoint?.y ?? midY}
          r={6}
          fill="hsl(var(--background))"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          className="cursor-move pointer-events-none"
          style={{ opacity: 0.8 }}
        />
      )}
      
      {/* Control point while dragging */}
      {isDragging && controlPoint && (
        <>
          <line
            x1={sourceX}
            y1={sourceY}
            x2={controlPoint.x}
            y2={controlPoint.y}
            stroke="hsl(var(--primary) / 0.3)"
            strokeWidth={1}
            strokeDasharray="4 2"
          />
          <line
            x1={controlPoint.x}
            y1={controlPoint.y}
            x2={targetX}
            y2={targetY}
            stroke="hsl(var(--primary) / 0.3)"
            strokeWidth={1}
            strokeDasharray="4 2"
          />
          <circle
            cx={controlPoint.x}
            cy={controlPoint.y}
            r={8}
            fill="hsl(var(--primary))"
            className="pointer-events-none"
          />
        </>
      )}
      
      {/* Label */}
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className={`nodrag nopan ${isDraggingLabel ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={handleLabelMouseDown}
          >
            <div 
              className={`
                px-2.5 py-1 text-xs rounded-md font-medium shadow-sm
                bg-background border transition-all
                ${selected 
                  ? 'border-primary text-primary ring-2 ring-primary/20' 
                  : 'border-border text-foreground hover:border-primary/50'
                }
              `}
            >
              {data.label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
      
      {/* Hint when selected */}
      {selected && !data?.label && !isStraight && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${midX}px, ${midY}px)`,
              pointerEvents: 'none',
              opacity: 0.6,
            }}
            className="text-[10px] text-muted-foreground whitespace-nowrap"
          >
            Arraste para curvar
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

export default SimpleEdge;

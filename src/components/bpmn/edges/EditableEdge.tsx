import { useState, useCallback, useRef } from 'react';
import {
  EdgeProps,
  getSmoothStepPath,
  EdgeLabelRenderer,
  useReactFlow,
} from 'reactflow';

interface Waypoint {
  x: number;
  y: number;
}

export function EditableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}: EdgeProps) {
  const { setEdges, getViewport } = useReactFlow();
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGPathElement>(null);
  
  const waypoints: Waypoint[] = data?.waypoints || [];
  
  // Calculate path with waypoints
  let edgePath: string;
  let labelX: number;
  let labelY: number;
  
  if (waypoints.length === 0) {
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 8,
    });
  } else {
    // Build custom path through waypoints
    const points = [
      { x: sourceX, y: sourceY },
      ...waypoints,
      { x: targetX, y: targetY },
    ];
    
    edgePath = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      edgePath += ` L ${points[i].x},${points[i].y}`;
    }
    
    // Label at midpoint
    const midIndex = Math.floor(points.length / 2);
    labelX = points[midIndex].x;
    labelY = points[midIndex].y;
  }

  // Convert screen coordinates to flow coordinates
  const screenToFlowPosition = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current?.closest('svg');
    if (!svg) return { x: 0, y: 0 };
    
    const rect = svg.getBoundingClientRect();
    const { x: viewX, y: viewY, zoom } = getViewport();
    
    return {
      x: (clientX - rect.left - viewX) / zoom,
      y: (clientY - rect.top - viewY) / zoom,
    };
  }, [getViewport]);

  // Handle dragging the entire edge - adds a waypoint and drags it
  const handleEdgeDrag = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    
    setIsDragging(true);
    
    const startPos = screenToFlowPosition(event.clientX, event.clientY);
    
    // Add a new waypoint at the drag start position
    const newWaypoint = { x: startPos.x, y: startPos.y };
    const newWaypoints = [...waypoints, newWaypoint];
    const newIndex = newWaypoints.length - 1;
    
    // Update edges with new waypoint
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === id
          ? { ...edge, data: { ...edge.data, waypoints: newWaypoints } }
          : edge
      )
    );
    
    const onMouseMove = (e: MouseEvent) => {
      const currentPos = screenToFlowPosition(e.clientX, e.clientY);
      
      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.id !== id) return edge;
          const currentWaypoints = [...(edge.data?.waypoints || [])];
          if (currentWaypoints[newIndex]) {
            currentWaypoints[newIndex] = { x: currentPos.x, y: currentPos.y };
          }
          return { ...edge, data: { ...edge.data, waypoints: currentWaypoints } };
        })
      );
    };
    
    const onMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [id, waypoints, setEdges, screenToFlowPosition]);

  const handleWaypointDrag = useCallback((
    index: number,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    setIsDragging(true);
    
    const startWaypoint = { ...waypoints[index] };
    const startPos = screenToFlowPosition(event.clientX, event.clientY);
    
    const onMouseMove = (e: MouseEvent) => {
      const currentPos = screenToFlowPosition(e.clientX, e.clientY);
      const dx = currentPos.x - startPos.x;
      const dy = currentPos.y - startPos.y;
      
      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.id !== id) return edge;
          const currentWaypoints = [...(edge.data?.waypoints || [])];
          currentWaypoints[index] = {
            x: startWaypoint.x + dx,
            y: startWaypoint.y + dy,
          };
          return { ...edge, data: { ...edge.data, waypoints: currentWaypoints } };
        })
      );
    };
    
    const onMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [id, waypoints, setEdges, screenToFlowPosition]);

  const removeWaypoint = useCallback((index: number, event: React.MouseEvent) => {
    if (event.detail === 2) { // Double click to remove
      event.stopPropagation();
      const newWaypoints = waypoints.filter((_, i) => i !== index);
      setEdges((eds) =>
        eds.map((edge) =>
          edge.id === id
            ? { ...edge, data: { ...edge.data, waypoints: newWaypoints } }
            : edge
        )
      );
    }
  }, [id, waypoints, setEdges]);

  return (
    <>
      {/* Invisible wider path for easier selection and dragging */}
      <path
        ref={svgRef}
        d={edgePath}
        fill="none"
        strokeWidth={20}
        stroke="transparent"
        className="cursor-grab active:cursor-grabbing"
        onMouseDown={handleEdgeDrag}
      />
      
      {/* Visible edge path */}
      <path
        id={id}
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: selected ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
          transition: isDragging ? 'none' : 'stroke 0.2s, stroke-width 0.2s',
        }}
        className="react-flow__edge-path pointer-events-none"
        d={edgePath}
        markerEnd={markerEnd}
        fill="none"
      />
      
      {/* Waypoint handles - only show when selected */}
      {selected && waypoints.length > 0 && (
        <EdgeLabelRenderer>
          {waypoints.map((waypoint, index) => (
            <div
              key={index}
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${waypoint.x}px, ${waypoint.y}px)`,
                pointerEvents: 'all',
              }}
              className="nodrag nopan"
            >
              <div
                className="w-3 h-3 bg-primary border-2 border-background rounded-full cursor-move shadow-md hover:scale-125 transition-transform"
                onMouseDown={(e) => handleWaypointDrag(index, e)}
                onDoubleClick={(e) => removeWaypoint(index, e)}
                title="Arraste para mover • Duplo clique para remover"
              />
            </div>
          ))}
        </EdgeLabelRenderer>
      )}
      
      {/* Hint when selected but no waypoints */}
      {selected && waypoints.length === 0 && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 20}px)`,
              pointerEvents: 'none',
            }}
          >
            <span className="text-[10px] text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded">
              Arraste a linha para ajustar o caminho
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

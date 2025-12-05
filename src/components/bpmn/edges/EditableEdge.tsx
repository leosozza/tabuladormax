import { useState, useCallback } from 'react';
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
  const { setEdges } = useReactFlow();
  const [isDragging, setIsDragging] = useState(false);
  
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

  const handleWaypointDrag = useCallback((
    index: number,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    setIsDragging(true);
    
    const startX = event.clientX;
    const startY = event.clientY;
    const currentWaypoints = [...waypoints];
    const startWaypoint = { ...currentWaypoints[index] };
    
    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      currentWaypoints[index] = {
        x: startWaypoint.x + dx,
        y: startWaypoint.y + dy,
      };
      
      setEdges((eds) =>
        eds.map((edge) =>
          edge.id === id
            ? { ...edge, data: { ...edge.data, waypoints: [...currentWaypoints] } }
            : edge
        )
      );
    };
    
    const onMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [id, waypoints, setEdges]);

  const addWaypoint = useCallback((event: React.MouseEvent) => {
    if (event.detail === 2) { // Double click
      event.stopPropagation();
      
      const rect = (event.target as SVGElement).closest('svg')?.getBoundingClientRect();
      if (!rect) return;
      
      const newWaypoint = {
        x: (sourceX + targetX) / 2,
        y: (sourceY + targetY) / 2,
      };
      
      setEdges((eds) =>
        eds.map((edge) =>
          edge.id === id
            ? { ...edge, data: { ...edge.data, waypoints: [...waypoints, newWaypoint] } }
            : edge
        )
      );
    }
  }, [id, sourceX, sourceY, targetX, targetY, waypoints, setEdges]);

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
      {/* Invisible wider path for easier selection */}
      <path
        d={edgePath}
        fill="none"
        strokeWidth={20}
        stroke="transparent"
        className="cursor-pointer"
        onClick={addWaypoint}
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
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        fill="none"
      />
      
      {/* Waypoint handles - only show when selected */}
      {selected && (
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
          
          {/* Add waypoint hint */}
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 20}px)`,
              pointerEvents: 'none',
            }}
          >
            <span className="text-[10px] text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded">
              Duplo clique na linha para adicionar ponto
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
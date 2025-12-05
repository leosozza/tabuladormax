import { useState, useCallback, useRef, useEffect } from 'react';
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
  const { setEdges, screenToFlowPosition } = useReactFlow();
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

  // Get center point of the edge for the "add waypoint" handle
  const getCenterPoint = useCallback(() => {
    if (waypoints.length === 0) {
      return { x: labelX, y: labelY };
    }
    // Center between source and first waypoint, or between waypoints
    const midIdx = Math.floor(waypoints.length / 2);
    return waypoints[midIdx];
  }, [waypoints, labelX, labelY]);

  // Handle creating a new waypoint from the center handle
  const handleCenterMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    let waypointCreated = false;
    let newWaypointIndex = -1;
    
    setIsDragging(true);
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.stopPropagation();
      moveEvent.preventDefault();
      
      const dx = Math.abs(moveEvent.clientX - startClientX);
      const dy = Math.abs(moveEvent.clientY - startClientY);
      
      // Create waypoint after small movement
      if (!waypointCreated && (dx > 3 || dy > 3)) {
        waypointCreated = true;
        const flowPos = screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
        newWaypointIndex = waypoints.length;
        
        setEdges((eds) =>
          eds.map((edge) =>
            edge.id === id
              ? { 
                  ...edge, 
                  data: { 
                    ...edge.data, 
                    waypoints: [...(edge.data?.waypoints || []), { x: flowPos.x, y: flowPos.y }] 
                  } 
                }
              : edge
          )
        );
      }
      
      // Update waypoint position
      if (waypointCreated && newWaypointIndex >= 0) {
        const flowPos = screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
        
        setEdges((eds) =>
          eds.map((edge) => {
            if (edge.id !== id) return edge;
            const currentWaypoints = [...(edge.data?.waypoints || [])];
            if (currentWaypoints[newWaypointIndex]) {
              currentWaypoints[newWaypointIndex] = { x: flowPos.x, y: flowPos.y };
            }
            return { ...edge, data: { ...edge.data, waypoints: currentWaypoints } };
          })
        );
      }
    };
    
    const onMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [id, waypoints, setEdges, screenToFlowPosition]);

  // Handle dragging existing waypoint
  const handleWaypointMouseDown = useCallback((index: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    setIsDragging(true);
    
    const startWaypoint = { ...waypoints[index] };
    const startFlowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.stopPropagation();
      moveEvent.preventDefault();
      
      const currentFlowPos = screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
      const dx = currentFlowPos.x - startFlowPos.x;
      const dy = currentFlowPos.y - startFlowPos.y;
      
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

  // Remove waypoint on double click
  const handleRemoveWaypoint = useCallback((index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const newWaypoints = waypoints.filter((_, i) => i !== index);
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === id
          ? { ...edge, data: { ...edge.data, waypoints: newWaypoints } }
          : edge
      )
    );
  }, [id, waypoints, setEdges]);

  const centerPoint = getCenterPoint();

  return (
    <>
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
      
      {/* Label - ONLY show if there's actual text */}
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div className="px-2 py-1 text-xs rounded bg-background/95 border border-border/50 text-foreground font-medium shadow-sm">
              {data.label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
      
      {/* Interactive handles - only when selected */}
      {selected && (
        <EdgeLabelRenderer>
          {/* Center handle to create new waypoint */}
          {waypoints.length === 0 && (
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${centerPoint.x}px, ${centerPoint.y}px)`,
                pointerEvents: 'all',
              }}
              className="nodrag nopan"
            >
              <div
                className="w-5 h-5 bg-primary/20 border-2 border-primary rounded-full cursor-grab hover:bg-primary/40 hover:scale-110 transition-all flex items-center justify-center"
                onMouseDown={handleCenterMouseDown}
                title="Arraste para ajustar a linha"
              >
                <div className="w-2 h-2 bg-primary rounded-full" />
              </div>
            </div>
          )}
          
          {/* Existing waypoint handles */}
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
                className="w-4 h-4 bg-primary border-2 border-background rounded-full cursor-move shadow-lg hover:scale-125 transition-transform"
                onMouseDown={(e) => handleWaypointMouseDown(index, e)}
                onDoubleClick={(e) => handleRemoveWaypoint(index, e)}
                title="Arraste para mover • Duplo clique para remover"
              />
            </div>
          ))}
        </EdgeLabelRenderer>
      )}
    </>
  );
}

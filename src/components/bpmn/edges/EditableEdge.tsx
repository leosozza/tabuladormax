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
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelText, setLabelText] = useState(data?.label || '');
  const svgRef = useRef<SVGPathElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
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

  // Handle dragging the edge - creates a waypoint immediately and drags it
  const handleEdgeDrag = useCallback((event: React.PointerEvent) => {
    // CRITICAL: Stop all propagation to prevent ReactFlow from capturing the event
    event.stopPropagation();
    event.preventDefault();
    event.nativeEvent.stopImmediatePropagation();
    
    // Capture pointer for reliable tracking
    const target = event.currentTarget as SVGPathElement;
    target.setPointerCapture(event.pointerId);
    
    const startX = event.clientX;
    const startY = event.clientY;
    let waypointCreated = false;
    let newIndex = -1;
    
    const onPointerMove = (e: PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      
      // Create waypoint after minimal movement (2px threshold)
      if (!waypointCreated && (dx > 2 || dy > 2)) {
        waypointCreated = true;
        setIsDragging(true);
        
        // Add a new waypoint at the current position
        const currentPos = screenToFlowPosition(e.clientX, e.clientY);
        newIndex = waypoints.length;
        
        setEdges((eds) =>
          eds.map((edge) =>
            edge.id === id
              ? { ...edge, data: { ...edge.data, waypoints: [...(edge.data?.waypoints || []), { x: currentPos.x, y: currentPos.y }] } }
              : edge
          )
        );
      }
      
      // Update waypoint position while dragging
      if (waypointCreated && newIndex >= 0) {
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
      }
    };
    
    const onPointerUp = (e: PointerEvent) => {
      e.stopPropagation();
      target.releasePointerCapture(e.pointerId);
      setIsDragging(false);
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerup', onPointerUp);
    };
    
    target.addEventListener('pointermove', onPointerMove);
    target.addEventListener('pointerup', onPointerUp);
  }, [id, waypoints, setEdges, screenToFlowPosition]);

  const handleWaypointDrag = useCallback((
    index: number,
    event: React.PointerEvent
  ) => {
    event.stopPropagation();
    event.preventDefault();
    event.nativeEvent.stopImmediatePropagation();
    
    const target = event.currentTarget as HTMLDivElement;
    target.setPointerCapture(event.pointerId);
    
    setIsDragging(true);
    
    const startWaypoint = { ...waypoints[index] };
    const startPos = screenToFlowPosition(event.clientX, event.clientY);
    
    const onPointerMove = (e: PointerEvent) => {
      e.stopPropagation();
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
    
    const onPointerUp = (e: PointerEvent) => {
      e.stopPropagation();
      target.releasePointerCapture(e.pointerId);
      setIsDragging(false);
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerup', onPointerUp);
    };
    
    target.addEventListener('pointermove', onPointerMove);
    target.addEventListener('pointerup', onPointerUp);
  }, [id, waypoints, setEdges, screenToFlowPosition]);

  // Remove waypoint on double click
  const removeWaypoint = useCallback((index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    const newWaypoints = waypoints.filter((_, i) => i !== index);
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === id
          ? { ...edge, data: { ...edge.data, waypoints: newWaypoints } }
          : edge
      )
    );
  }, [id, waypoints, setEdges]);

  // Save label
  const saveLabel = useCallback(() => {
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === id
          ? { ...edge, data: { ...edge.data, label: labelText } }
          : edge
      )
    );
    setIsEditingLabel(false);
  }, [id, labelText, setEdges]);

  // Handle label key down
  const handleLabelKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveLabel();
    }
    if (e.key === 'Escape') {
      setLabelText(data?.label || '');
      setIsEditingLabel(false);
    }
  }, [saveLabel, data?.label]);

  // Start editing label
  const startEditingLabel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setLabelText(data?.label || '');
    setIsEditingLabel(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }, [data?.label]);

  return (
    <>
      {/* Invisible wider path for easier selection and dragging */}
      <path
        ref={svgRef}
        d={edgePath}
        fill="none"
        strokeWidth={20}
        stroke="transparent"
        style={{ touchAction: 'none', cursor: isDragging ? 'grabbing' : 'grab' }}
        onPointerDown={handleEdgeDrag}
        className="nodrag nopan"
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
      
      {/* Edge Label - Always visible, editable on double click */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {isEditingLabel ? (
            <input
              ref={inputRef}
              type="text"
              value={labelText}
              onChange={(e) => setLabelText(e.target.value)}
              onBlur={saveLabel}
              onKeyDown={handleLabelKeyDown}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="px-2 py-1 text-xs rounded border border-primary bg-background text-foreground min-w-[60px] text-center focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Texto..."
            />
          ) : (
            <div
              onDoubleClick={startEditingLabel}
              className={`px-2 py-1 text-xs rounded cursor-text select-none transition-colors ${
                data?.label 
                  ? 'bg-background/95 border border-border/50 text-foreground font-medium shadow-sm' 
                  : 'bg-background/70 text-muted-foreground italic hover:bg-background/90'
              }`}
            >
              {data?.label || '+ texto'}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
      
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
                touchAction: 'none',
              }}
              className="nodrag nopan"
            >
              <div
                className="w-3 h-3 bg-primary border-2 border-background rounded-full cursor-move shadow-md hover:scale-125 transition-transform"
                onPointerDown={(e) => handleWaypointDrag(index, e)}
                onDoubleClick={(e) => removeWaypoint(index, e)}
                title="Arraste para mover • Duplo clique para remover"
              />
            </div>
          ))}
        </EdgeLabelRenderer>
      )}
      
      {/* Hint when selected but no waypoints */}
      {selected && waypoints.length === 0 && !isEditingLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 25}px)`,
              pointerEvents: 'none',
            }}
          >
            <span className="text-[10px] text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded">
              Arraste a linha para ajustar
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

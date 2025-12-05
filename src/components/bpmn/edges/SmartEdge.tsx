import { memo, useState, useCallback, useRef, useEffect } from 'react';
import {
  EdgeProps,
  EdgeLabelRenderer,
  useReactFlow,
  getSmoothStepPath,
  Position,
} from 'reactflow';
import { SmartEdgeData, EdgeRoutingMode, WaypointData } from './types';
import { getStraightPath } from './routing/straight';
import { getOrthogonalPath } from './routing/orthogonal';
import { getSmoothPath } from './routing/smooth';
import { getBezierPath } from './routing/bezier';

interface SmartEdgeProps extends EdgeProps<SmartEdgeData> {}

export const SmartEdge = memo(function SmartEdge({
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
}: SmartEdgeProps) {
  const { setEdges } = useReactFlow();
  const [isDraggingLabel, setIsDraggingLabel] = useState(false);
  const [isDraggingWaypoint, setIsDraggingWaypoint] = useState<number | null>(null);
  const [isDraggingHandle, setIsDraggingHandle] = useState<{ index: number; type: 'in' | 'out' } | null>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  
  const routingMode: EdgeRoutingMode = data?.routingMode || 'orthogonal';
  const waypoints: WaypointData[] = data?.waypoints || [];
  const labelPosition = data?.labelPosition;
  
  // Calculate path based on routing mode
  let edgePath: string;
  let labelX: number;
  let labelY: number;
  
  switch (routingMode) {
    case 'straight':
      [edgePath, labelX, labelY] = getStraightPath({
        sourceX, sourceY, targetX, targetY,
        sourcePosition, targetPosition,
        waypoints,
      });
      break;
    case 'smooth':
      [edgePath, labelX, labelY] = getSmoothPath({
        sourceX, sourceY, targetX, targetY,
        sourcePosition, targetPosition,
        waypoints,
      });
      break;
    case 'freeform':
      [edgePath, labelX, labelY] = getBezierPath({
        sourceX, sourceY, targetX, targetY,
        sourcePosition, targetPosition,
        controlPoints: waypoints,
      });
      break;
    case 'orthogonal':
    default:
      if (waypoints.length === 0) {
        [edgePath, labelX, labelY] = getSmoothStepPath({
          sourceX, sourceY, sourcePosition,
          targetX, targetY, targetPosition,
          borderRadius: 8,
        });
      } else {
        [edgePath, labelX, labelY] = getOrthogonalPath({
          sourceX, sourceY, targetX, targetY,
          sourcePosition, targetPosition,
          waypoints,
        });
      }
      break;
  }
  
  // Use custom label position if set
  const finalLabelX = labelPosition?.x ?? labelX;
  const finalLabelY = labelPosition?.y ?? labelY;
  
  // Add waypoint on double-click
  const handlePathDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    const svg = (e.target as SVGElement).closest('svg');
    if (!svg) return;
    
    const rect = svg.getBoundingClientRect();
    const point = svg.createSVGPoint();
    point.x = e.clientX - rect.left;
    point.y = e.clientY - rect.top;
    
    const ctm = svg.getScreenCTM()?.inverse();
    if (!ctm) return;
    
    const transformedPoint = point.matrixTransform(ctm);
    
    const newWaypoint: WaypointData = {
      x: transformedPoint.x,
      y: transformedPoint.y,
    };
    
    // For freeform mode, initialize bezier handles
    if (routingMode === 'freeform') {
      const offset = 30;
      newWaypoint.handleIn = { x: transformedPoint.x - offset, y: transformedPoint.y };
      newWaypoint.handleOut = { x: transformedPoint.x + offset, y: transformedPoint.y };
    }
    
    const newWaypoints = [...waypoints, newWaypoint];
    
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === id
          ? { ...edge, data: { ...edge.data, waypoints: newWaypoints } }
          : edge
      )
    );
  }, [id, waypoints, setEdges, routingMode]);
  
  // Drag waypoint
  const handleWaypointMouseDown = useCallback((e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingWaypoint(index);
  }, []);
  
  // Drag bezier handle
  const handleBezierHandleMouseDown = useCallback((e: React.MouseEvent, index: number, type: 'in' | 'out') => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingHandle({ index, type });
  }, []);
  
  // Delete waypoint on double-click
  const handleWaypointDoubleClick = useCallback((e: React.MouseEvent, index: number) => {
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
  
  // Drag label
  const handleLabelMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingLabel(true);
  }, []);
  
  // Global mouse move/up for dragging
  useEffect(() => {
    if (isDraggingWaypoint === null && !isDraggingLabel && !isDraggingHandle) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const svg = document.querySelector('.react-flow__edges svg') as SVGSVGElement;
      if (!svg) return;
      
      const rect = svg.getBoundingClientRect();
      const point = svg.createSVGPoint();
      point.x = e.clientX;
      point.y = e.clientY;
      
      const ctm = svg.getScreenCTM()?.inverse();
      if (!ctm) return;
      
      const transformedPoint = point.matrixTransform(ctm);
      
      if (isDraggingWaypoint !== null) {
        const newWaypoints = waypoints.map((wp, i) => {
          if (i !== isDraggingWaypoint) return wp;
          
          // Calculate delta for moving handles together
          const dx = transformedPoint.x - wp.x;
          const dy = transformedPoint.y - wp.y;
          
          return {
            ...wp,
            x: transformedPoint.x,
            y: transformedPoint.y,
            // Move handles with the point
            handleIn: wp.handleIn ? { x: wp.handleIn.x + dx, y: wp.handleIn.y + dy } : undefined,
            handleOut: wp.handleOut ? { x: wp.handleOut.x + dx, y: wp.handleOut.y + dy } : undefined,
          };
        });
        
        setEdges((eds) =>
          eds.map((edge) =>
            edge.id === id
              ? { ...edge, data: { ...edge.data, waypoints: newWaypoints } }
              : edge
          )
        );
      }
      
      if (isDraggingHandle) {
        const { index, type } = isDraggingHandle;
        const newWaypoints = waypoints.map((wp, i) => {
          if (i !== index) return wp;
          
          if (type === 'in') {
            return { ...wp, handleIn: { x: transformedPoint.x, y: transformedPoint.y } };
          } else {
            return { ...wp, handleOut: { x: transformedPoint.x, y: transformedPoint.y } };
          }
        });
        
        setEdges((eds) =>
          eds.map((edge) =>
            edge.id === id
              ? { ...edge, data: { ...edge.data, waypoints: newWaypoints } }
              : edge
          )
        );
      }
      
      if (isDraggingLabel) {
        setEdges((eds) =>
          eds.map((edge) =>
            edge.id === id
              ? { 
                  ...edge, 
                  data: { 
                    ...edge.data, 
                    labelPosition: { x: transformedPoint.x, y: transformedPoint.y } 
                  } 
                }
              : edge
          )
        );
      }
    };
    
    const handleMouseUp = () => {
      setIsDraggingWaypoint(null);
      setIsDraggingLabel(false);
      setIsDraggingHandle(null);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingWaypoint, isDraggingLabel, isDraggingHandle, id, waypoints, setEdges]);
  
  const strokeColor = selected 
    ? 'hsl(var(--primary))' 
    : 'hsl(var(--muted-foreground))';
  
  return (
    <>
      {/* Main edge path */}
      <path
        id={id}
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: strokeColor,
          transition: 'stroke 0.15s, stroke-width 0.15s',
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
        className="react-flow__edge-interaction cursor-pointer"
        onDoubleClick={handlePathDoubleClick}
      />
      
      {/* Waypoint handles and bezier control handles - only show when selected */}
      {selected && waypoints.map((wp, index) => (
        <g key={`waypoint-${index}`}>
          {/* Bezier handle lines (freeform mode) */}
          {routingMode === 'freeform' && wp.handleIn && (
            <line
              x1={wp.x}
              y1={wp.y}
              x2={wp.handleIn.x}
              y2={wp.handleIn.y}
              stroke="hsl(var(--primary) / 0.5)"
              strokeWidth={1}
              strokeDasharray="4 2"
            />
          )}
          {routingMode === 'freeform' && wp.handleOut && (
            <line
              x1={wp.x}
              y1={wp.y}
              x2={wp.handleOut.x}
              y2={wp.handleOut.y}
              stroke="hsl(var(--primary) / 0.5)"
              strokeWidth={1}
              strokeDasharray="4 2"
            />
          )}
          
          {/* Bezier handle circles (freeform mode) */}
          {routingMode === 'freeform' && wp.handleIn && (
            <circle
              cx={wp.handleIn.x}
              cy={wp.handleIn.y}
              r={5}
              fill="hsl(var(--primary))"
              className="cursor-crosshair"
              onMouseDown={(e) => handleBezierHandleMouseDown(e, index, 'in')}
            />
          )}
          {routingMode === 'freeform' && wp.handleOut && (
            <circle
              cx={wp.handleOut.x}
              cy={wp.handleOut.y}
              r={5}
              fill="hsl(var(--primary))"
              className="cursor-crosshair"
              onMouseDown={(e) => handleBezierHandleMouseDown(e, index, 'out')}
            />
          )}
          
          {/* Main waypoint circle */}
          <circle
            cx={wp.x}
            cy={wp.y}
            r={8}
            fill="hsl(var(--background))"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            className="cursor-move"
            onMouseDown={(e) => handleWaypointMouseDown(e, index)}
            onDoubleClick={(e) => handleWaypointDoubleClick(e, index)}
          />
          <circle
            cx={wp.x}
            cy={wp.y}
            r={3}
            fill="hsl(var(--primary))"
            className="pointer-events-none"
          />
        </g>
      ))}
      
      {/* Label */}
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            ref={labelRef}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${finalLabelX}px, ${finalLabelY}px)`,
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
      
      {/* Add waypoint hint when selected */}
      {selected && !data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
              opacity: 0.6,
            }}
            className="text-[10px] text-muted-foreground whitespace-nowrap"
          >
            Duplo clique para adicionar ponto
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

export default SmartEdge;

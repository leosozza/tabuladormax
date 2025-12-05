import { Position } from 'reactflow';

export interface BezierPoint {
  x: number;
  y: number;
  handleIn?: { x: number; y: number };
  handleOut?: { x: number; y: number };
}

interface GetBezierPathParams {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  controlPoints?: BezierPoint[];
}

// Calculate control handles for smooth curves
function calculateControlHandles(
  prev: { x: number; y: number },
  current: { x: number; y: number },
  next: { x: number; y: number },
  tension: number = 0.3
): { handleIn: { x: number; y: number }; handleOut: { x: number; y: number } } {
  const dx = next.x - prev.x;
  const dy = next.y - prev.y;
  
  return {
    handleIn: {
      x: current.x - dx * tension,
      y: current.y - dy * tension,
    },
    handleOut: {
      x: current.x + dx * tension,
      y: current.y + dy * tension,
    },
  };
}

// Generate smooth bezier path through points
export function getBezierPath({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  controlPoints = [],
}: GetBezierPathParams): [string, number, number] {
  const points: { x: number; y: number }[] = [
    { x: sourceX, y: sourceY },
    ...controlPoints.map(p => ({ x: p.x, y: p.y })),
    { x: targetX, y: targetY },
  ];
  
  if (points.length === 2) {
    // Simple quadratic bezier for no control points
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    
    // Calculate control point based on positions
    let cx: number, cy: number;
    
    if (sourcePosition === Position.Bottom || sourcePosition === Position.Top) {
      cx = sourceX + dx * 0.5;
      cy = sourceY + dy * 0.5;
    } else {
      cx = sourceX + dx * 0.5;
      cy = sourceY + dy * 0.5;
    }
    
    const path = `M ${sourceX} ${sourceY} Q ${cx} ${cy} ${targetX} ${targetY}`;
    
    // Label at midpoint of curve
    const labelX = sourceX + dx * 0.5;
    const labelY = sourceY + dy * 0.5 - 10;
    
    return [path, labelX, labelY];
  }
  
  // Build cubic bezier path through control points
  let path = `M ${points[0].x} ${points[0].y}`;
  
  // For custom control points with handles
  if (controlPoints.length > 0 && controlPoints[0].handleIn) {
    for (let i = 0; i < controlPoints.length; i++) {
      const cp = controlPoints[i];
      const prev = i === 0 ? points[0] : controlPoints[i - 1];
      const next = i === controlPoints.length - 1 ? points[points.length - 1] : controlPoints[i + 1];
      
      if (i === 0) {
        // First segment: from source to first control point
        const c1x = prev.x + (cp.x - prev.x) * 0.5;
        const c1y = prev.y;
        const c2x = cp.handleIn?.x ?? (cp.x - (next.x - prev.x) * 0.15);
        const c2y = cp.handleIn?.y ?? (cp.y - (next.y - prev.y) * 0.15);
        
        path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${cp.x} ${cp.y}`;
      }
      
      if (i === controlPoints.length - 1) {
        // Last segment: from last control point to target
        const target = points[points.length - 1];
        const c1x = cp.handleOut?.x ?? (cp.x + (target.x - prev.x) * 0.15);
        const c1y = cp.handleOut?.y ?? (cp.y + (target.y - prev.y) * 0.15);
        const c2x = target.x - (target.x - cp.x) * 0.5;
        const c2y = target.y;
        
        path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${target.x} ${target.y}`;
      } else {
        // Middle segments
        const nextCp = controlPoints[i + 1];
        const c1x = cp.handleOut?.x ?? (cp.x + (nextCp.x - prev.x) * 0.15);
        const c1y = cp.handleOut?.y ?? (cp.y + (nextCp.y - prev.y) * 0.15);
        const c2x = nextCp.handleIn?.x ?? (nextCp.x - (next.x - cp.x) * 0.15);
        const c2y = nextCp.handleIn?.y ?? (nextCp.y - (next.y - cp.y) * 0.15);
        
        path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${nextCp.x} ${nextCp.y}`;
      }
    }
  } else {
    // Auto-generate smooth curve through points using Catmull-Rom
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      
      const tension = 0.35;
      
      // Catmull-Rom to Bezier conversion
      const c1x = p1.x + (p2.x - p0.x) * tension;
      const c1y = p1.y + (p2.y - p0.y) * tension;
      const c2x = p2.x - (p3.x - p1.x) * tension;
      const c2y = p2.y - (p3.y - p1.y) * tension;
      
      path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
    }
  }
  
  // Calculate label position at curve midpoint
  const midIndex = Math.floor(points.length / 2);
  const labelX = points[midIndex].x;
  const labelY = points[midIndex].y - 15;
  
  return [path, labelX, labelY];
}

// Get point on cubic bezier at t
export function getPointOnBezier(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number
): { x: number; y: number } {
  const t2 = t * t;
  const t3 = t2 * t;
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  
  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
}

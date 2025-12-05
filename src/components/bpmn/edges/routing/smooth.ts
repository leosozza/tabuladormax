import { Position } from 'reactflow';
import { WaypointData } from '../types';

export interface SmoothPathParams {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  waypoints?: WaypointData[];
  curvature?: number;
}

function getControlPoints(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition: Position,
  targetPosition: Position,
  curvature: number
): { c1x: number; c1y: number; c2x: number; c2y: number } {
  const dx = Math.abs(targetX - sourceX);
  const dy = Math.abs(targetY - sourceY);
  const distance = Math.sqrt(dx * dx + dy * dy);
  const curveOffset = Math.min(distance * curvature, 150);
  
  let c1x = sourceX;
  let c1y = sourceY;
  let c2x = targetX;
  let c2y = targetY;
  
  switch (sourcePosition) {
    case Position.Right:
      c1x = sourceX + curveOffset;
      break;
    case Position.Left:
      c1x = sourceX - curveOffset;
      break;
    case Position.Bottom:
      c1y = sourceY + curveOffset;
      break;
    case Position.Top:
      c1y = sourceY - curveOffset;
      break;
  }
  
  switch (targetPosition) {
    case Position.Right:
      c2x = targetX + curveOffset;
      break;
    case Position.Left:
      c2x = targetX - curveOffset;
      break;
    case Position.Bottom:
      c2y = targetY + curveOffset;
      break;
    case Position.Top:
      c2y = targetY - curveOffset;
      break;
  }
  
  return { c1x, c1y, c2x, c2y };
}

export function getSmoothPath({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  waypoints = [],
  curvature = 0.5,
}: SmoothPathParams): [string, number, number] {
  // If waypoints exist, create a smooth curve through them
  if (waypoints.length > 0) {
    const allPoints = [
      { x: sourceX, y: sourceY },
      ...waypoints,
      { x: targetX, y: targetY },
    ];
    
    let path = `M ${sourceX} ${sourceY}`;
    
    // Use quadratic curves for smooth path through waypoints
    for (let i = 1; i < allPoints.length; i++) {
      const prev = allPoints[i - 1];
      const curr = allPoints[i];
      const next = allPoints[i + 1];
      
      if (next) {
        // Create smooth curve using control point
        const cpX = curr.x;
        const cpY = curr.y;
        const endX = (curr.x + next.x) / 2;
        const endY = (curr.y + next.y) / 2;
        path += ` Q ${cpX} ${cpY} ${endX} ${endY}`;
      } else {
        // Last segment - straight or quadratic to target
        path += ` Q ${curr.x} ${curr.y} ${curr.x} ${curr.y}`;
      }
    }
    
    // Final connection to target
    if (waypoints.length > 0) {
      const lastWp = waypoints[waypoints.length - 1];
      path = `M ${sourceX} ${sourceY}`;
      
      // Simple quadratic curve through waypoints
      for (let i = 0; i < waypoints.length; i++) {
        const wp = waypoints[i];
        const prevPoint = i === 0 ? { x: sourceX, y: sourceY } : waypoints[i - 1];
        const midX = (prevPoint.x + wp.x) / 2;
        const midY = (prevPoint.y + wp.y) / 2;
        
        if (i === 0) {
          path += ` Q ${midX} ${midY} ${wp.x} ${wp.y}`;
        } else {
          path += ` T ${wp.x} ${wp.y}`;
        }
      }
      path += ` T ${targetX} ${targetY}`;
    }
    
    // Calculate label position
    const midIndex = Math.floor(waypoints.length / 2);
    const labelX = waypoints[midIndex]?.x || (sourceX + targetX) / 2;
    const labelY = waypoints[midIndex]?.y || (sourceY + targetY) / 2;
    
    return [path, labelX, labelY];
  }
  
  // Default bezier curve without waypoints
  const { c1x, c1y, c2x, c2y } = getControlPoints(
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition, curvature
  );
  
  const path = `M ${sourceX} ${sourceY} C ${c1x} ${c1y} ${c2x} ${c2y} ${targetX} ${targetY}`;
  
  // Label at midpoint of bezier
  const t = 0.5;
  const labelX = Math.pow(1 - t, 3) * sourceX + 
                 3 * Math.pow(1 - t, 2) * t * c1x + 
                 3 * (1 - t) * Math.pow(t, 2) * c2x + 
                 Math.pow(t, 3) * targetX;
  const labelY = Math.pow(1 - t, 3) * sourceY + 
                 3 * Math.pow(1 - t, 2) * t * c1y + 
                 3 * (1 - t) * Math.pow(t, 2) * c2y + 
                 Math.pow(t, 3) * targetY;
  
  return [path, labelX, labelY];
}

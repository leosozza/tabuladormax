import { Position } from 'reactflow';
import { WaypointData } from '../types';

export interface OrthogonalPathParams {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  waypoints?: WaypointData[];
  offset?: number;
}

function getDirection(position: Position): { x: number; y: number } {
  switch (position) {
    case Position.Top: return { x: 0, y: -1 };
    case Position.Bottom: return { x: 0, y: 1 };
    case Position.Left: return { x: -1, y: 0 };
    case Position.Right: return { x: 1, y: 0 };
    default: return { x: 1, y: 0 };
  }
}

export function getOrthogonalPath({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  waypoints = [],
  offset = 25,
}: OrthogonalPathParams): [string, number, number, WaypointData[]] {
  // If user has defined waypoints, use them
  if (waypoints.length > 0) {
    let path = `M ${sourceX} ${sourceY}`;
    
    for (const wp of waypoints) {
      path += ` L ${wp.x} ${wp.y}`;
    }
    
    path += ` L ${targetX} ${targetY}`;
    
    // Calculate midpoint for label
    const midIndex = Math.floor(waypoints.length / 2);
    let labelX: number;
    let labelY: number;
    
    if (waypoints.length % 2 === 0) {
      const wp1 = waypoints[midIndex - 1] || { x: sourceX, y: sourceY };
      const wp2 = waypoints[midIndex] || { x: targetX, y: targetY };
      labelX = (wp1.x + wp2.x) / 2;
      labelY = (wp1.y + wp2.y) / 2;
    } else {
      labelX = waypoints[midIndex].x;
      labelY = waypoints[midIndex].y;
    }
    
    return [path, labelX, labelY, waypoints];
  }

  // Auto-generate orthogonal path
  const sourceDir = getDirection(sourcePosition);
  const targetDir = getDirection(targetPosition);
  
  const points: WaypointData[] = [];
  
  // Start point with offset
  const startPoint = {
    x: sourceX + sourceDir.x * offset,
    y: sourceY + sourceDir.y * offset,
  };
  
  // End point with offset
  const endPoint = {
    x: targetX + targetDir.x * offset,
    y: targetY + targetDir.y * offset,
  };
  
  points.push(startPoint);
  
  // Calculate intermediate points based on source/target positions
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  
  // Same axis - need two intermediate points
  if (sourcePosition === Position.Right && targetPosition === Position.Left) {
    const midX = startPoint.x + dx / 2;
    points.push({ x: midX, y: startPoint.y });
    points.push({ x: midX, y: endPoint.y });
  } else if (sourcePosition === Position.Left && targetPosition === Position.Right) {
    const midX = startPoint.x + dx / 2;
    points.push({ x: midX, y: startPoint.y });
    points.push({ x: midX, y: endPoint.y });
  } else if (sourcePosition === Position.Bottom && targetPosition === Position.Top) {
    const midY = startPoint.y + dy / 2;
    points.push({ x: startPoint.x, y: midY });
    points.push({ x: endPoint.x, y: midY });
  } else if (sourcePosition === Position.Top && targetPosition === Position.Bottom) {
    const midY = startPoint.y + dy / 2;
    points.push({ x: startPoint.x, y: midY });
    points.push({ x: endPoint.x, y: midY });
  } else {
    // Perpendicular connections - one intermediate point
    if (sourceDir.x !== 0) {
      points.push({ x: endPoint.x, y: startPoint.y });
    } else {
      points.push({ x: startPoint.x, y: endPoint.y });
    }
  }
  
  points.push(endPoint);
  
  // Build path
  let path = `M ${sourceX} ${sourceY}`;
  for (const p of points) {
    path += ` L ${p.x} ${p.y}`;
  }
  path += ` L ${targetX} ${targetY}`;
  
  // Calculate label position
  const midIdx = Math.floor(points.length / 2);
  const labelX = points.length > 0 ? points[midIdx].x : (sourceX + targetX) / 2;
  const labelY = points.length > 0 ? points[midIdx].y : (sourceY + targetY) / 2;
  
  return [path, labelX, labelY, points];
}

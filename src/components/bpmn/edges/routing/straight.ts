import { Position } from 'reactflow';
import { WaypointData } from '../types';

export interface PathParams {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  waypoints?: WaypointData[];
}

export function getStraightPath({
  sourceX,
  sourceY,
  targetX,
  targetY,
  waypoints = [],
}: PathParams): [string, number, number] {
  let path = `M ${sourceX} ${sourceY}`;
  
  // Add waypoints
  for (const wp of waypoints) {
    path += ` L ${wp.x} ${wp.y}`;
  }
  
  path += ` L ${targetX} ${targetY}`;
  
  // Calculate label position (midpoint of entire path)
  let labelX: number;
  let labelY: number;
  
  if (waypoints.length > 0) {
    const midIndex = Math.floor(waypoints.length / 2);
    if (waypoints.length % 2 === 0 && waypoints.length > 0) {
      const wp1 = waypoints[midIndex - 1];
      const wp2 = waypoints[midIndex];
      labelX = (wp1.x + wp2.x) / 2;
      labelY = (wp1.y + wp2.y) / 2;
    } else {
      labelX = waypoints[midIndex].x;
      labelY = waypoints[midIndex].y;
    }
  } else {
    labelX = (sourceX + targetX) / 2;
    labelY = (sourceY + targetY) / 2;
  }
  
  return [path, labelX, labelY];
}

import { EdgeProps } from 'reactflow';

export type EdgeRoutingMode = 'straight' | 'orthogonal' | 'smooth';

export type BpmnEdgeType = 'sequenceFlow' | 'messageFlow' | 'association';

export interface WaypointData {
  x: number;
  y: number;
}

export interface SmartEdgeData {
  label?: string;
  type?: BpmnEdgeType;
  routingMode?: EdgeRoutingMode;
  waypoints?: WaypointData[];
  condition?: string;
  isDefault?: boolean;
  labelPosition?: { x: number; y: number };
}

export interface SmartEdgeProps extends EdgeProps<SmartEdgeData> {}

export const DEFAULT_EDGE_DATA: SmartEdgeData = {
  type: 'sequenceFlow',
  routingMode: 'orthogonal',
  waypoints: [],
};

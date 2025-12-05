import { EdgeProps } from 'reactflow';

// Simplified routing modes: just straight or curved
export type EdgeRoutingMode = 'straight' | 'curved';

export type BpmnEdgeType = 'sequenceFlow' | 'messageFlow' | 'association';

// Single control point for quadratic bezier curve
export interface ControlPoint {
  x: number;
  y: number;
}

export interface SimpleEdgeData {
  label?: string;
  type?: BpmnEdgeType;
  routingMode?: EdgeRoutingMode;
  controlPoint?: ControlPoint;
  condition?: string;
  isDefault?: boolean;
  labelPosition?: { x: number; y: number };
}

export interface SimpleEdgeProps extends EdgeProps<SimpleEdgeData> {}

export const DEFAULT_EDGE_DATA: SimpleEdgeData = {
  type: 'sequenceFlow',
  routingMode: 'curved',
};

// Node colors
export type NodeColor = 'blue' | 'yellow' | 'orange' | 'purple' | 'green' | 'red' | 'gray' | 'pink' | 'teal';

export interface NodeColorConfig {
  gradient: string;
  shadow: string;
  iconBg: string;
  border: string;
  handle: string;
}

export const NODE_COLORS: Record<NodeColor, NodeColorConfig> = {
  blue: {
    gradient: 'from-blue-400 to-blue-600',
    shadow: 'shadow-blue-500/25',
    iconBg: 'bg-blue-500',
    border: 'border-blue-300',
    handle: '!bg-blue-500',
  },
  yellow: {
    gradient: 'from-yellow-400 to-yellow-600',
    shadow: 'shadow-yellow-500/25',
    iconBg: 'bg-yellow-500',
    border: 'border-yellow-300',
    handle: '!bg-yellow-500',
  },
  orange: {
    gradient: 'from-orange-400 to-orange-600',
    shadow: 'shadow-orange-500/25',
    iconBg: 'bg-orange-500',
    border: 'border-orange-300',
    handle: '!bg-orange-500',
  },
  purple: {
    gradient: 'from-purple-400 to-purple-600',
    shadow: 'shadow-purple-500/25',
    iconBg: 'bg-purple-500',
    border: 'border-purple-300',
    handle: '!bg-purple-500',
  },
  green: {
    gradient: 'from-emerald-400 to-emerald-600',
    shadow: 'shadow-emerald-500/25',
    iconBg: 'bg-emerald-500',
    border: 'border-emerald-300',
    handle: '!bg-emerald-500',
  },
  red: {
    gradient: 'from-rose-400 to-rose-600',
    shadow: 'shadow-rose-500/25',
    iconBg: 'bg-rose-500',
    border: 'border-rose-300',
    handle: '!bg-rose-500',
  },
  gray: {
    gradient: 'from-slate-400 to-slate-600',
    shadow: 'shadow-slate-500/25',
    iconBg: 'bg-slate-500',
    border: 'border-slate-300',
    handle: '!bg-slate-500',
  },
  pink: {
    gradient: 'from-pink-400 to-pink-600',
    shadow: 'shadow-pink-500/25',
    iconBg: 'bg-pink-500',
    border: 'border-pink-300',
    handle: '!bg-pink-500',
  },
  teal: {
    gradient: 'from-teal-400 to-teal-600',
    shadow: 'shadow-teal-500/25',
    iconBg: 'bg-teal-500',
    border: 'border-teal-300',
    handle: '!bg-teal-500',
  },
};

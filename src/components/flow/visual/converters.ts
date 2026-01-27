// ============================================
// Flow Converters - Steps ↔ ReactFlow Nodes/Edges
// ============================================

import { Node, Edge } from 'reactflow';
import type { FlowStep } from '@/types/flow';

/**
 * Convert FlowStep[] to ReactFlow Nodes
 */
export function convertStepsToNodes(steps: FlowStep[]): Node[] {
  return [
    // Start node
    {
      id: 'start',
      type: 'start',
      position: { x: 250, y: 50 },
      data: { label: 'Início' }
    },
    // Step nodes
    ...steps.map((step, index) => ({
      id: step.id,
      type: step.type,
      position: { x: 250, y: 150 + (index * 120) },
      data: step
    }))
  ];
}

/**
 * Convert FlowStep[] to ReactFlow Edges
 */
export function convertStepsToEdges(steps: FlowStep[]): Edge[] {
  const edges: Edge[] = [];
  
  // Connect start to first step
  if (steps.length > 0) {
    edges.push({
      id: `e-start-${steps[0].id}`,
      source: 'start',
      target: steps[0].id,
      animated: true
    });
  }
  
  // Connect steps sequentially
  for (let i = 0; i < steps.length - 1; i++) {
    edges.push({
      id: `e-${steps[i].id}-${steps[i + 1].id}`,
      source: steps[i].id,
      target: steps[i + 1].id,
      animated: true
    });
  }

  // Add branching edges for template buttons (sourceHandle = button-{index})
  for (const step of steps) {
    if (step.type !== 'gupshup_send_template') continue;

    const buttons = (step.config as any)?.buttons as Array<{ nextStepId?: string }> | undefined;
    if (!buttons?.length) continue;

    buttons.forEach((btn, index) => {
      if (!btn?.nextStepId) return;
      edges.push({
        id: `e-${step.id}-button-${index}-${btn.nextStepId}`,
        source: step.id,
        sourceHandle: `button-${index}`,
        target: btn.nextStepId,
        animated: true,
      });
    });
  }
  
  return edges;
}

/**
 * Convert ReactFlow Nodes back to FlowStep[]
 * Uses topological sort to maintain execution order
 */
export function convertNodesToSteps(nodes: Node[], edges: Edge[]): FlowStep[] {
  // Filter out start node
  const stepNodes = nodes.filter(n => n.id !== 'start');
  
  // Sort nodes based on their connections (topological sort)
  const sortedNodes = topologicalSort(stepNodes, edges);
  
  return sortedNodes.map(node => node.data as FlowStep);
}

/**
 * Topological sort using Kahn's algorithm
 */
function topologicalSort(nodes: Node[], edges: Edge[]): Node[] {
  // Build adjacency list and in-degree count
  const adjacencyList = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  
  // Initialize
  nodes.forEach(node => {
    adjacencyList.set(node.id, []);
    inDegree.set(node.id, 0);
  });
  
  // Build graph
  edges.forEach(edge => {
    if (edge.source !== 'start' && adjacencyList.has(edge.source)) {
      adjacencyList.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }
  });
  
  // Find nodes with no incoming edges
  const queue: Node[] = [];
  nodes.forEach(node => {
    if (inDegree.get(node.id) === 0) {
      queue.push(node);
    }
  });
  
  // Process queue
  const sorted: Node[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    
    const neighbors = adjacencyList.get(current.id) || [];
    neighbors.forEach(neighborId => {
      inDegree.set(neighborId, (inDegree.get(neighborId) || 0) - 1);
      if (inDegree.get(neighborId) === 0) {
        const neighborNode = nodes.find(n => n.id === neighborId);
        if (neighborNode) queue.push(neighborNode);
      }
    });
  }
  
  // If sorted length doesn't match input, there's a cycle
  // In that case, return nodes in their original order
  return sorted.length === nodes.length ? sorted : nodes;
}

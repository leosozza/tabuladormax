// ============================================
// Visual Flow Editor - ReactFlow canvas
// ============================================

import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  NodeTypes
} from 'reactflow';
import 'reactflow/dist/style.css';
import './styles.css';

import { StartNode } from './nodes/StartNode';
import { TabularNode } from './nodes/TabularNode';
import { HttpCallNode } from './nodes/HttpCallNode';
import { WaitNode } from './nodes/WaitNode';
import { convertStepsToNodes, convertStepsToEdges, convertNodesToSteps } from './converters';
import type { FlowStep } from '@/types/flow';

const nodeTypes: NodeTypes = {
  start: StartNode,
  tabular: TabularNode,
  http_call: HttpCallNode,
  wait: WaitNode
};

interface VisualFlowEditorProps {
  initialSteps: FlowStep[];
  onChange: (steps: FlowStep[]) => void;
  onSelectNode?: (node: Node | null) => void;
}

export function VisualFlowEditor({ initialSteps, onChange, onSelectNode }: VisualFlowEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(convertStepsToNodes(initialSteps));
  const [edges, setEdges, onEdgesChange] = useEdgesState(convertStepsToEdges(initialSteps));
  const [hasChanges, setHasChanges] = useState(false);

  // Sync when initialSteps change externally
  useEffect(() => {
    if (!hasChanges) {
      setNodes(convertStepsToNodes(initialSteps));
      setEdges(convertStepsToEdges(initialSteps));
    }
  }, [initialSteps, hasChanges, setNodes, setEdges]);

  // Convert nodes/edges back to steps when they change
  useEffect(() => {
    if (hasChanges) {
      const newSteps = convertNodesToSteps(nodes, edges);
      onChange(newSteps);
    }
  }, [nodes, edges, hasChanges, onChange]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
      setHasChanges(true);
    },
    [setEdges]
  );

  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      setHasChanges(true);
    },
    [onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChange(changes);
      setHasChanges(true);
    },
    [onEdgesChange]
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onSelectNode?.(node);
    },
    [onSelectNode]
  );

  const handlePaneClick = useCallback(() => {
    onSelectNode?.(null);
  }, [onSelectNode]);

  return (
    <div className="h-[600px] w-full border-2 rounded-lg overflow-hidden bg-muted/20">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-background"
      >
        <Background gap={16} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'start': return '#3b82f6';
              case 'tabular': return '#60a5fa';
              case 'http_call': return '#a855f7';
              case 'wait': return '#f59e0b';
              default: return '#94a3b8';
            }
          }}
          className="bg-background"
        />
      </ReactFlow>
    </div>
  );
}

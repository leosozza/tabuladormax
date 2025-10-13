// ============================================
// Visual Flow Editor - ReactFlow canvas with drag & drop
// ============================================

import { useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  NodeTypes,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './styles.css';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';

import { StartNode } from './nodes/StartNode';
import { TabularNode } from './nodes/TabularNode';
import { HttpCallNode } from './nodes/HttpCallNode';
import { WaitNode } from './nodes/WaitNode';
import { CustomNode } from './nodes/CustomNode';
import { SendMessageNode } from './nodes/SendMessageNode';
import { ConditionNode } from './nodes/ConditionNode';
import { NodePalette } from './NodePalette';
import { NodeConfigPanel } from './NodeConfigPanel';
import { VariablePicker } from './VariablePicker';
import { convertStepsToNodes, convertStepsToEdges, convertNodesToSteps } from './converters';
import { useFlowBuilder } from '@/lib/hooks/use-flow-builder';
import type { FlowStep, FlowStepType } from '@/types/flow';

const nodeTypes: NodeTypes = {
  start: StartNode,
  tabular: TabularNode,
  http_call: HttpCallNode,
  wait: WaitNode,
  custom: CustomNode,
  send_message: SendMessageNode,
  condition: ConditionNode,
};

interface VisualFlowEditorProps {
  initialSteps: FlowStep[];
  onChange: (steps: FlowStep[]) => void;
}

export function VisualFlowEditor({ initialSteps, onChange }: VisualFlowEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  
  // Auto-hide panels on mobile/tablet, show on desktop
  const [showNodePalette, setShowNodePalette] = useState(true);
  const [showVariables, setShowVariables] = useState(true);

  // Detect screen size and auto-hide panels on smaller screens
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
      
      if (isMobile) {
        // Hide both panels on mobile
        setShowNodePalette(false);
        setShowVariables(false);
      } else if (isTablet) {
        // Hide variables panel on tablet
        setShowNodePalette(true);
        setShowVariables(false);
      }
      // Desktop keeps both panels visible by default
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const initialNodes = convertStepsToNodes(initialSteps);
  const initialEdges = convertStepsToEdges(initialSteps);

  const {
    nodes,
    edges,
    selectedNode,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    onPaneClick,
    addNode,
    updateNodeData,
    deleteNode,
  } = useFlowBuilder(initialNodes, initialEdges);

  // Sync changes back to parent
  useEffect(() => {
    const newSteps = convertNodesToSteps(nodes, edges);
    onChange(newSteps);
  }, [nodes, edges, onChange]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as FlowStepType;
      if (!type || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
    },
    [reactFlowInstance, addNode]
  );

  return (
    <div ref={reactFlowWrapper} className="h-full w-full flex border rounded-lg overflow-hidden bg-background">
      {/* Left Panel - Node Palette */}
      {showNodePalette && (
        <div className="w-64 lg:w-64 md:w-56 border-r flex-shrink-0 flex flex-col overflow-hidden bg-background">
          <NodePalette />
        </div>
      )}

      {/* Center Panel - ReactFlow Canvas */}
      <div className="flex-1 relative min-w-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          className="bg-muted/20"
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
                case 'send_message': return '#10b981';
                case 'condition': return '#eab308';
                default: return '#94a3b8';
              }
            }}
            className="bg-background"
          />
          
          {/* Toggle buttons for panels */}
          <Panel position="top-left" className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNodePalette(!showNodePalette)}
              className="bg-background"
              title={showNodePalette ? "Ocultar Paleta de Nós" : "Mostrar Paleta de Nós"}
            >
              {showNodePalette ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </Button>
          </Panel>
          
          <Panel position="top-right" className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVariables(!showVariables)}
              className="bg-background"
              title={showVariables ? "Ocultar Variáveis" : "Mostrar Variáveis"}
            >
              {showVariables ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </Button>
          </Panel>
        </ReactFlow>
      </div>

      {/* Right Panel - Variables */}
      {showVariables && (
        <div className="w-80 lg:w-80 md:w-64 border-l flex-shrink-0 flex flex-col overflow-hidden bg-background">
          <VariablePicker />
        </div>
      )}

      {/* Node Config Panel - Overlay when node selected */}
      {selectedNode && selectedNode.id !== 'start' && (
        <div className="absolute right-0 top-0 bottom-0 w-96 max-w-full md:max-w-96 border-l shadow-lg z-10 overflow-hidden bg-background">
          <NodeConfigPanel
            selectedNode={selectedNode}
            onUpdate={(nodeId, updates) => updateNodeData(nodeId, updates)}
            onDelete={(nodeId) => deleteNode(nodeId)}
          />
        </div>
      )}
    </div>
  );
}

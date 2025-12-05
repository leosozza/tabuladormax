import { useCallback, useState, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';

import StartEventNode from './nodes/StartEventNode';
import EndEventNode from './nodes/EndEventNode';
import TaskNode from './nodes/TaskNode';
import GatewayNode from './nodes/GatewayNode';
import DataStoreNode from './nodes/DataStoreNode';
import SubprocessNode from './nodes/SubprocessNode';
import AnnotationNode from './nodes/AnnotationNode';
import { BpmnNodePalette } from './BpmnNodePalette';
import { BpmnNodeType } from '@/types/bpmn';
import { Button } from '@/components/ui/button';
import { Save, Download, Trash2, PanelLeftClose, PanelLeft } from 'lucide-react';

const nodeTypes = {
  startEvent: StartEventNode,
  endEvent: EndEventNode,
  task: TaskNode,
  userTask: TaskNode,
  serviceTask: TaskNode,
  gateway: GatewayNode,
  dataStore: DataStoreNode,
  subprocess: SubprocessNode,
  annotation: AnnotationNode,
};

interface BpmnEditorProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  readOnly?: boolean;
}

let nodeId = 0;
const getNodeId = () => `node_${nodeId++}`;

export function BpmnEditor({ initialNodes = [], initialEdges = [], onSave, readOnly = false }: BpmnEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [showPalette, setShowPalette] = useState(true);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'hsl(var(--primary))' } }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/bpmn-node') as BpmnNodeType;
      if (!type || !reactFlowInstance || !reactFlowWrapper.current) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: getNodeId(),
        type,
        position,
        data: { label: getDefaultLabel(type), type },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onAddNode = useCallback((type: BpmnNodeType) => {
    if (!reactFlowInstance) return;
    
    const position = reactFlowInstance.project({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });

    const newNode: Node = {
      id: getNodeId(),
      type,
      position,
      data: { label: getDefaultLabel(type), type },
    };

    setNodes((nds) => nds.concat(newNode));
  }, [reactFlowInstance, setNodes]);

  const handleSave = () => {
    onSave?.(nodes, edges);
  };

  const handleDeleteSelected = () => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
      setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
    }
  };

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  };

  const onPaneClick = () => {
    setSelectedNode(null);
  };

  return (
    <div className="flex h-full bg-background">
      {!readOnly && showPalette && (
        <BpmnNodePalette onAddNode={onAddNode} />
      )}
      
      <div className="flex-1 flex flex-col">
        {!readOnly && (
          <div className="flex items-center justify-between p-2 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPalette(!showPalette)}
              >
                {showPalette ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
              </Button>
              {selectedNode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteSelected}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Excluir
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1" />
                Exportar
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="w-4 h-4 mr-1" />
                Salvar
              </Button>
            </div>
          </div>
        )}
        
        <div ref={reactFlowWrapper} className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={readOnly ? undefined : onNodesChange}
            onEdgesChange={readOnly ? undefined : onEdgesChange}
            onConnect={readOnly ? undefined : onConnect}
            onInit={setReactFlowInstance}
            onDrop={readOnly ? undefined : onDrop}
            onDragOver={readOnly ? undefined : onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable={!readOnly}
          >
            <Background gap={15} size={1} />
            <Controls />
            <MiniMap 
              nodeStrokeColor={() => 'hsl(var(--primary))'}
              nodeColor={() => 'hsl(var(--card))'}
              maskColor="hsl(var(--background) / 0.8)"
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

function getDefaultLabel(type: BpmnNodeType): string {
  const labels: Record<BpmnNodeType, string> = {
    startEvent: 'Início',
    endEvent: 'Fim',
    task: 'Tarefa',
    userTask: 'Tarefa Manual',
    serviceTask: 'Tarefa Auto',
    gateway: 'Decisão',
    subprocess: 'Subprocesso',
    dataStore: 'Banco de Dados',
    annotation: 'Nota',
  };
  return labels[type] || 'Elemento';
}

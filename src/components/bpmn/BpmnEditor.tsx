import { useCallback, useState, useRef, useEffect } from 'react';
import ReactFlow, {
  Background,
  MiniMap,
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowInstance,
  BackgroundVariant,
  EdgeTypes,
  OnEdgesChange,
  OnNodesChange,
  ConnectionMode,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';

import StartEventNode from './nodes/StartEventNode';
import EndEventNode from './nodes/EndEventNode';
import TaskNode from './nodes/TaskNode';
import GatewayNode from './nodes/GatewayNode';
import DataStoreNode from './nodes/DataStoreNode';
import SubprocessNode from './nodes/SubprocessNode';
import AnnotationNode from './nodes/AnnotationNode';
import { SmartEdge } from './edges/SmartEdge';
import { BpmnNodePalette } from './BpmnNodePalette';
import { BpmnNodeType } from '@/types/bpmn';
import { EdgeRoutingMode, SmartEdgeData } from './edges/types';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { Button } from '@/components/ui/button';
import { 
  Save, Download, Trash2, Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, 
  MousePointer2, Hand, Plus, Minus, ArrowRight, CornerDownRight, Spline
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

const edgeTypes: EdgeTypes = {
  smart: SmartEdge,
};

interface BpmnEditorProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  readOnly?: boolean;
}

let nodeId = 0;
const getNodeId = () => `node_${nodeId++}`;

// Normalize edges to use smart edge type
const normalizeEdges = (edges: Edge[]): Edge[] => {
  return edges.map(edge => ({
    ...edge,
    type: 'smart',
    data: {
      routingMode: 'orthogonal',
      waypoints: [],
      ...edge.data,
    } as SmartEdgeData,
  }));
};

export function BpmnEditor({ initialNodes = [], initialEdges = [], onSave, readOnly = false }: BpmnEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(normalizeEdges(initialEdges));
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [tool, setTool] = useState<'select' | 'pan'>('select');
  const [isMiddleClickPanning, setIsMiddleClickPanning] = useState(false);
  
  // Undo/Redo system
  const { canUndo, canRedo, undo, redo, takeSnapshot } = useUndoRedo();
  const isUndoRedoAction = useRef(false);
  
  // Take snapshot before changes (for undo)
  const recordChange = useCallback(() => {
    if (!isUndoRedoAction.current) {
      takeSnapshot(nodes, edges);
    }
  }, [nodes, edges, takeSnapshot]);
  
  // Custom node changes handler with undo support
  const onNodesChange: OnNodesChange = useCallback((changes) => {
    // Record before applying if it's a significant change
    const hasSignificantChange = changes.some(
      c => c.type === 'position' || c.type === 'remove' || c.type === 'add'
    );
    
    if (hasSignificantChange && !isUndoRedoAction.current) {
      takeSnapshot(nodes, edges);
    }
    
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, [nodes, edges, takeSnapshot]);
  
  // Custom edge changes handler with undo support
  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    const hasSignificantChange = changes.some(
      c => c.type === 'remove' || c.type === 'add'
    );
    
    if (hasSignificantChange && !isUndoRedoAction.current) {
      takeSnapshot(nodes, edges);
    }
    
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, [nodes, edges, takeSnapshot]);
  
  // Undo handler
  const handleUndo = useCallback(() => {
    const previousState = undo();
    if (previousState) {
      isUndoRedoAction.current = true;
      setNodes(previousState.nodes);
      setEdges(previousState.edges);
      setSelectedNode(null);
      setSelectedEdge(null);
      setTimeout(() => {
        isUndoRedoAction.current = false;
      }, 50);
    }
  }, [undo]);
  
  // Redo handler
  const handleRedo = useCallback(() => {
    const nextState = redo();
    if (nextState) {
      isUndoRedoAction.current = true;
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setSelectedNode(null);
      setSelectedEdge(null);
      setTimeout(() => {
        isUndoRedoAction.current = false;
      }, 50);
    }
  }, [redo]);

  // Handle delete for selected node or edge
  const handleDeleteSelected = useCallback(() => {
    recordChange();
    
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
      setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
    }
    if (selectedEdge) {
      setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
      setSelectedEdge(null);
    }
  }, [selectedNode, selectedEdge, recordChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      // Tool shortcuts (only when not in input)
      if (!isInput) {
        if (e.key === 'v' || e.key === 'V') setTool('select');
        if (e.key === 'h' || e.key === 'H') setTool('pan');
        if (e.key === ' ') setIsMiddleClickPanning(true);
        
        // Delete/Backspace to remove selected element
        if (e.key === 'Delete' || e.key === 'Backspace') {
          handleDeleteSelected();
        }
      }
      
      // Undo/Redo (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
      if ((e.ctrlKey || e.metaKey) && !isInput) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        }
        if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') setIsMiddleClickPanning(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleDeleteSelected, handleUndo, handleRedo]);

  // Middle click pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      setIsMiddleClickPanning(true);
    }
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      setIsMiddleClickPanning(false);
    }
  }, []);

  const onConnect = useCallback(
    (params: Connection) => {
      recordChange();
      setEdges((eds) => addEdge({ 
        ...params, 
        type: 'smart',
        data: {
          routingMode: 'orthogonal',
          waypoints: [],
        } as SmartEdgeData,
      }, eds));
    },
    [recordChange]
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

      recordChange();

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
    [reactFlowInstance, recordChange]
  );

  const onAddNode = useCallback((type: BpmnNodeType) => {
    if (!reactFlowInstance) return;
    
    recordChange();
    
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
  }, [reactFlowInstance, recordChange]);

  const handleSave = () => {
    onSave?.(nodes, edges);
  };

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  };

  const onEdgeClick = (_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  };

  const onPaneClick = () => {
    setSelectedNode(null);
    setSelectedEdge(null);
  };

  const handleZoomIn = () => reactFlowInstance?.zoomIn();
  const handleZoomOut = () => reactFlowInstance?.zoomOut();
  const handleFitView = () => reactFlowInstance?.fitView();

  const togglePalette = () => setPaletteCollapsed(!paletteCollapsed);

  // Update edge label
  const updateEdgeLabel = useCallback((edgeId: string, label: string) => {
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === edgeId
          ? { ...edge, data: { ...edge.data, label } }
          : edge
      )
    );
    setSelectedEdge((prev) =>
      prev?.id === edgeId
        ? { ...prev, data: { ...prev.data, label } }
        : prev
    );
  }, []);
  
  // Update edge routing mode
  const updateEdgeRoutingMode = useCallback((edgeId: string, routingMode: EdgeRoutingMode) => {
    recordChange();
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === edgeId
          ? { 
              ...edge, 
              data: { 
                ...edge.data, 
                routingMode,
                waypoints: [], // Clear waypoints when changing mode
                labelPosition: undefined, // Reset label position
              } 
            }
          : edge
      )
    );
    setSelectedEdge((prev) =>
      prev?.id === edgeId
        ? { 
            ...prev, 
            data: { 
              ...prev.data, 
              routingMode,
              waypoints: [],
              labelPosition: undefined,
            } 
          }
        : prev
    );
  }, [recordChange]);
  
  // Clear edge waypoints
  const clearEdgeWaypoints = useCallback((edgeId: string) => {
    recordChange();
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === edgeId
          ? { ...edge, data: { ...edge.data, waypoints: [], labelPosition: undefined } }
          : edge
      )
    );
    setSelectedEdge((prev) =>
      prev?.id === edgeId
        ? { ...prev, data: { ...prev.data, waypoints: [], labelPosition: undefined } }
        : prev
    );
  }, [recordChange]);

  // Determine if we should pan
  const shouldPan = tool === 'pan' || isMiddleClickPanning;
  
  // Get routing mode icon
  const getRoutingIcon = (mode: EdgeRoutingMode) => {
    switch (mode) {
      case 'straight': return <ArrowRight className="w-4 h-4" />;
      case 'orthogonal': return <CornerDownRight className="w-4 h-4" />;
      case 'smooth': return <Spline className="w-4 h-4" />;
    }
  };

  return (
    <TooltipProvider>
      <div 
        className="flex h-full bg-[#f8f9fa] dark:bg-[#1a1a1a] relative overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        style={{ cursor: isMiddleClickPanning ? 'grabbing' : undefined }}
      >
        {/* Palette - Miro style floating left */}
        {!readOnly && (
          <div className="absolute left-4 top-4 z-10">
            <BpmnNodePalette 
              onAddNode={onAddNode} 
              collapsed={paletteCollapsed}
              onToggleCollapse={togglePalette}
            />
          </div>
        )}
        
        {/* Canvas */}
        <div ref={reactFlowWrapper} className="flex-1 h-full">
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
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            snapToGrid
            snapGrid={[20, 20]}
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable={!readOnly}
            edgesUpdatable={!readOnly}
            edgesFocusable={!readOnly}
            panOnDrag={shouldPan ? [0, 1, 2] : false}
            panOnScroll={false}
            zoomOnScroll={true}
            selectionOnDrag={false}
            selectNodesOnDrag={false}
            connectionMode={ConnectionMode.Loose}
            defaultEdgeOptions={{
              type: 'smart',
              data: {
                routingMode: 'orthogonal',
                waypoints: [],
              } as SmartEdgeData,
            }}
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={20} 
              size={1.5}
              color="hsl(var(--muted-foreground) / 0.2)"
            />
            <MiniMap 
              className="!bg-background !border-border !shadow-lg !rounded-xl overflow-hidden"
              nodeStrokeWidth={3}
              maskColor="hsl(var(--background) / 0.85)"
            />
          </ReactFlow>
        </div>

        {/* Floating Bottom Toolbar - Miro style */}
        {!readOnly && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
            <div className="flex items-center gap-1 bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl px-2 py-2">
              {/* Tool Selection */}
              <div className="flex items-center gap-1 pr-2 border-r border-border/50">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={tool === 'select' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-9 w-9 rounded-xl"
                      onClick={() => setTool('select')}
                    >
                      <MousePointer2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Selecionar (V)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={tool === 'pan' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-9 w-9 rounded-xl"
                      onClick={() => setTool('pan')}
                    >
                      <Hand className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mover (H) • Scroll ou Middle-click</TooltipContent>
                </Tooltip>
              </div>

              {/* Add Elements */}
              <div className="flex items-center gap-1 px-2 border-r border-border/50">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 rounded-xl"
                      onClick={togglePalette}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Elementos BPMN</TooltipContent>
                </Tooltip>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 px-2 border-r border-border/50">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl" onClick={handleZoomOut}>
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Menos zoom</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl" onClick={handleZoomIn}>
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mais zoom</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl" onClick={handleFitView}>
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ajustar à tela</TooltipContent>
                </Tooltip>
              </div>

              {/* Undo/Redo */}
              <div className="flex items-center gap-1 px-2 border-r border-border/50">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-9 w-9 rounded-xl" 
                      disabled={!canUndo}
                      onClick={handleUndo}
                    >
                      <Undo2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Desfazer (Ctrl+Z)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-9 w-9 rounded-xl" 
                      disabled={!canRedo}
                      onClick={handleRedo}
                    >
                      <Redo2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refazer (Ctrl+Y)</TooltipContent>
                </Tooltip>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 pl-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-9 px-3 rounded-xl gap-2">
                      <Download className="w-4 h-4" />
                      <span className="text-sm">Exportar</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Exportar diagrama</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" className="h-9 px-4 rounded-xl gap-2" onClick={handleSave}>
                      <Save className="w-4 h-4" />
                      <span className="text-sm">Salvar</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Salvar diagrama</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        )}

        {/* Selected Node Actions - Floating */}
        {selectedNode && !readOnly && (
          <div className="absolute top-4 right-4 z-10">
            <div className="flex items-center gap-2 bg-background/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-lg px-3 py-2">
              <span className="text-sm font-medium text-foreground">
                {selectedNode.data.label}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteSelected}
                className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Selected Edge Actions - Enhanced panel */}
        {selectedEdge && !readOnly && (
          <div className="absolute top-4 right-4 z-10">
            <div className="flex flex-col gap-3 bg-background/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-lg p-4 min-w-[280px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Conexão selecionada
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteSelected}
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              
              {/* Label input */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Rótulo</label>
                <input
                  type="text"
                  value={selectedEdge.data?.label || ''}
                  onChange={(e) => updateEdgeLabel(selectedEdge.id, e.target.value)}
                  placeholder="Adicionar texto..."
                  className="h-9 px-3 text-sm border border-border rounded-lg bg-background text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              {/* Quick label buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8"
                  onClick={() => updateEdgeLabel(selectedEdge.id, 'Sim')}
                >
                  Sim
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8"
                  onClick={() => updateEdgeLabel(selectedEdge.id, 'Não')}
                >
                  Não
                </Button>
              </div>
              
              {/* Routing mode selector */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Tipo de linha</label>
                <div className="flex gap-1">
                  {(['straight', 'orthogonal', 'smooth'] as EdgeRoutingMode[]).map((mode) => (
                    <Tooltip key={mode}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={(selectedEdge.data as SmartEdgeData)?.routingMode === mode ? 'secondary' : 'outline'}
                          size="sm"
                          className="flex-1 h-9"
                          onClick={() => updateEdgeRoutingMode(selectedEdge.id, mode)}
                        >
                          {getRoutingIcon(mode)}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {mode === 'straight' && 'Linha reta'}
                        {mode === 'orthogonal' && 'Linha ortogonal'}
                        {mode === 'smooth' && 'Linha curva'}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
              
              {/* Waypoints info */}
              {((selectedEdge.data as SmartEdgeData)?.waypoints?.length || 0) > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">
                    {(selectedEdge.data as SmartEdgeData)?.waypoints?.length} ponto(s) de controle
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => clearEdgeWaypoints(selectedEdge.id)}
                  >
                    <Minus className="w-3 h-3 mr-1" />
                    Limpar
                  </Button>
                </div>
              )}
              
              {/* Help text */}
              <p className="text-[10px] text-muted-foreground leading-relaxed pt-2 border-t border-border/50">
                💡 <strong>Duplo clique</strong> na linha para adicionar pontos de controle.
                <br />
                <strong>Arraste</strong> os pontos para ajustar. <strong>Duplo clique</strong> no ponto para remover.
              </p>
            </div>
          </div>
        )}

        {/* Controls - Hide default, we have custom */}
        <style>{`
          .react-flow__controls {
            display: none;
          }
        `}</style>
      </div>
    </TooltipProvider>
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

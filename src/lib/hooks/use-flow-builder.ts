// ============================================
// Flow Builder Hook - Centraliza gerenciamento de nodes/edges
// ============================================

import { useCallback, useState } from 'react';
import {
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
} from 'reactflow';
import type { FlowStepType } from '@/types/flow';

export function useFlowBuilder(initialNodes: Node[] = [], initialEdges: Edge[] = []) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const addNode = useCallback((type: FlowStepType, position?: { x: number; y: number }) => {
    const id = `${type}-${Date.now()}`;
    const newNode: Node = {
      id,
      type: type === 'tabular' || type === 'http_call' || type === 'wait' ? type : 'custom',
      position: position || { x: 250, y: nodes.length * 120 + 150 },
      data: {
        id,
        type,
        nome: getDefaultLabel(type),
        descricao: '',
        config: getDefaultConfig(type),
      },
    };

    setNodes((nds) => [...nds, newNode]);
    return newNode;
  }, [nodes.length, setNodes]);

  const updateNodeData = useCallback((nodeId: string, data: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      )
    );
  }, [setNodes]);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return {
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
    setNodes,
    setEdges,
  };
}

function getDefaultLabel(type: FlowStepType): string {
  const labels: Record<FlowStepType, string> = {
    tabular: 'Tabulação',
    bitrix_connector: 'Bitrix',
    supabase_connector: 'Supabase',
    chatwoot_connector: 'Chatwoot',
    n8n_connector: 'N8N',
    http_call: 'HTTP Request',
    wait: 'Aguardar',
    send_message: 'Enviar Mensagem',
    condition: 'Condição',
    schedule_message: 'Agendar Mensagem',
    update_contact: 'Atualizar Contato',
    add_label: 'Adicionar Label',
    assign_agent: 'Atribuir Agente',
    assign_team: 'Atribuir Time',
  };
  return labels[type] || type;
}

function getDefaultConfig(type: FlowStepType): unknown {
  const configs: Record<FlowStepType, unknown> = {
    tabular: {
      buttonId: '',
      webhook_url: 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/crm.lead.update.json',
      field: 'STATUS_ID',
      value: '',
      field_type: 'string',
      additional_fields: [],
    },
    bitrix_connector: {
      action: 'update_lead',
      webhook_url: 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/crm.lead.update.json',
      field: '',
      value: '',
      field_type: 'string',
      additional_fields: [],
      lead_id: '{{leadId}}'
    },
    supabase_connector: {
      action: 'update',
      table: 'leads',
      filters: { id: '{{leadId}}' },
      data: {}
    },
    chatwoot_connector: {
      action: 'send_message',
      conversation_id: '{{conversationId}}',
      message: ''
    },
    n8n_connector: {
      webhook_url: '',
      method: 'POST',
      payload: {}
    },
    http_call: {
      url: '',
      method: 'GET',
      headers: {},
      body: {},
    },
    wait: {
      seconds: 5,
    },
    send_message: {
      conversationId: '{{conversation.id}}',
      message: '',
      messageType: 'outgoing',
    },
    condition: {
      conditions: [],
      logic: 'AND',
    },
    schedule_message: {
      conversationId: '{{conversation.id}}',
      message: '',
      delayMinutes: 60,
    },
    update_contact: {
      contactId: '{{sender.id}}',
      name: '',
      email: '',
      phone_number: '',
      custom_attributes: {},
    },
    add_label: {
      conversationId: '{{conversation.id}}',
      labels: [],
    },
    assign_agent: {
      conversationId: '{{conversation.id}}',
      agentId: '',
    },
    assign_team: {
      conversationId: '{{conversation.id}}',
      teamId: '',
    },
  };
  return configs[type] || {};
}

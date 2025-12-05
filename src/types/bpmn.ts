import { Node, Edge } from 'reactflow';

export type BpmnNodeType = 
  | 'startEvent'
  | 'endEvent'
  | 'task'
  | 'userTask'
  | 'serviceTask'
  | 'gateway'
  | 'subprocess'
  | 'dataStore'
  | 'annotation';

export type BpmnCategory = 'processo' | 'arquitetura' | 'fluxo-usuario' | 'integracao';

export interface BpmnNodeData {
  label: string;
  description?: string;
  type: BpmnNodeType;
  config?: Record<string, unknown>;
}

export interface ProcessDiagram {
  id: string;
  name: string;
  description?: string;
  category: BpmnCategory;
  module?: string;
  diagram_data: {
    nodes: Node<BpmnNodeData>[];
    edges: Edge[];
  };
  version: number;
  is_published: boolean;
  thumbnail?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface BpmnPaletteItem {
  type: BpmnNodeType;
  label: string;
  description: string;
  icon: string;
  category: 'eventos' | 'atividades' | 'gateways' | 'dados';
}

export const bpmnPaletteItems: BpmnPaletteItem[] = [
  // Eventos
  { type: 'startEvent', label: 'Início', description: 'Início do processo', icon: 'Circle', category: 'eventos' },
  { type: 'endEvent', label: 'Fim', description: 'Fim do processo', icon: 'CircleDot', category: 'eventos' },
  
  // Atividades
  { type: 'task', label: 'Tarefa', description: 'Tarefa genérica', icon: 'Square', category: 'atividades' },
  { type: 'userTask', label: 'Tarefa Manual', description: 'Executada por pessoa', icon: 'User', category: 'atividades' },
  { type: 'serviceTask', label: 'Tarefa Automática', description: 'Executada pelo sistema', icon: 'Cog', category: 'atividades' },
  { type: 'subprocess', label: 'Subprocesso', description: 'Processo aninhado', icon: 'FolderOpen', category: 'atividades' },
  
  // Gateways
  { type: 'gateway', label: 'Gateway', description: 'Decisão/Branch', icon: 'Diamond', category: 'gateways' },
  
  // Dados
  { type: 'dataStore', label: 'Banco de Dados', description: 'Armazenamento de dados', icon: 'Database', category: 'dados' },
  { type: 'annotation', label: 'Anotação', description: 'Comentário/Nota', icon: 'StickyNote', category: 'dados' },
];

export const categoryConfig: Record<BpmnCategory, { label: string; color: string; icon: string }> = {
  processo: { label: 'Processo', color: 'bg-blue-500', icon: 'GitBranch' },
  arquitetura: { label: 'Arquitetura', color: 'bg-purple-500', icon: 'Boxes' },
  'fluxo-usuario': { label: 'Fluxo de Usuário', color: 'bg-green-500', icon: 'Users' },
  integracao: { label: 'Integração', color: 'bg-orange-500', icon: 'Link' },
};

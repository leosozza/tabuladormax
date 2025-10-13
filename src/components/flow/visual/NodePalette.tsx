// ============================================
// Node Palette - Drag & drop to add nodes
// ============================================

import { 
  MousePointerClick, 
  Globe, 
  Clock, 
  MessageSquare, 
  GitBranch, 
  UserCog, 
  Tag, 
  UserPlus, 
  Users 
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { FlowStepType } from '@/types/flow';

interface NodePaletteProps {
  onAddNode?: (type: FlowStepType) => void;
}

const nodeTypes = [
  {
    type: 'tabular' as const,
    label: 'Tabulação',
    description: 'Ação de botão',
    icon: MousePointerClick,
  },
  {
    type: 'http_call' as const,
    label: 'HTTP Request',
    description: 'Requisição HTTP',
    icon: Globe,
  },
  {
    type: 'wait' as const,
    label: 'Aguardar',
    description: 'Adicionar delay',
    icon: Clock,
  },
  {
    type: 'send_message' as const,
    label: 'Enviar Mensagem',
    description: 'Envia para Chatwoot',
    icon: MessageSquare,
  },
  {
    type: 'condition' as const,
    label: 'Condição',
    description: 'Lógica condicional',
    icon: GitBranch,
  },
  {
    type: 'schedule_message' as const,
    label: 'Agendar Mensagem',
    description: 'Mensagem agendada',
    icon: Clock,
  },
  {
    type: 'update_contact' as const,
    label: 'Atualizar Contato',
    description: 'Edita info do contato',
    icon: UserCog,
  },
  {
    type: 'add_label' as const,
    label: 'Adicionar Label',
    description: 'Adiciona label',
    icon: Tag,
  },
  {
    type: 'assign_agent' as const,
    label: 'Atribuir Agente',
    description: 'Muda agente atribuído',
    icon: UserPlus,
  },
  {
    type: 'assign_team' as const,
    label: 'Atribuir Time',
    description: 'Atribui ao time',
    icon: Users,
  },
];

export function NodePalette({ onAddNode }: NodePaletteProps) {
  const handleDragStart = (event: React.DragEvent, type: FlowStepType) => {
    event.dataTransfer.setData('application/reactflow', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <Card className="p-4 max-h-[calc(100vh-120px)] overflow-y-auto">
      <h3 className="font-semibold text-sm mb-2">Adicionar Nós</h3>
      <p className="text-xs text-muted-foreground mb-3">Arraste para o canvas</p>
      <div className="space-y-2">
        {nodeTypes.map(({ type, label, description, icon: Icon }) => (
          <div
            key={type}
            draggable
            onDragStart={(e) => handleDragStart(e, type)}
            className="cursor-move border rounded-lg p-3 hover:bg-accent transition-colors bg-card"
          >
            <div className="flex items-start gap-3">
              <Icon className="h-5 w-5 mt-0.5 shrink-0" />
              <div className="text-left flex-1">
                <div className="font-medium text-sm">{label}</div>
                <div className="text-xs text-muted-foreground">{description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

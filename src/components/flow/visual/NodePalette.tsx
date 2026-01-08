// ============================================
// Node Palette - Drag & drop to add nodes
// ============================================

import { 
  MousePointerClick, 
  Database,
  Globe, 
  Clock, 
  MessageSquare, 
  GitBranch, 
  UserCog, 
  Tag, 
  UserPlus, 
  Users,
  Workflow
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { FlowStepType } from '@/types/flow';

interface NodePaletteProps {
  onAddNode?: (type: FlowStepType) => void;
}

const nodeTypes = [
  // ✅ WHATSAPP / GUPSHUP
  {
    type: 'gupshup_send_text' as const,
    label: 'WhatsApp: Texto',
    description: 'Envia texto via WhatsApp',
    icon: MessageSquare,
  },
  {
    type: 'gupshup_send_buttons' as const,
    label: 'WhatsApp: Botões',
    description: 'Mensagem com botões interativos',
    icon: MousePointerClick,
  },
  {
    type: 'gupshup_send_image' as const,
    label: 'WhatsApp: Imagem',
    description: 'Envia imagem via WhatsApp',
    icon: MessageSquare,
  },
  // ✅ CONECTORES
  {
    type: 'bitrix_connector' as const,
    label: 'Bitrix',
    description: 'Atualizar/Criar no Bitrix',
    icon: Database,
  },
  {
    type: 'bitrix_get_field' as const,
    label: 'Bitrix: Buscar Campo',
    description: 'Busca valor de campo do lead',
    icon: Database,
  },
  {
    type: 'supabase_connector' as const,
    label: 'Supabase',
    description: 'Banco de dados',
    icon: Database,
  },
  {
    type: 'n8n_connector' as const,
    label: 'N8N',
    description: 'Webhook externo',
    icon: Workflow,
  },
  // Tipos existentes
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
    description: 'Envia mensagem WhatsApp',
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
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-background flex-shrink-0">
        <h3 className="font-semibold text-sm mb-1">Adicionar Nós</h3>
        <p className="text-xs text-muted-foreground">Arraste para o canvas</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {nodeTypes.map(({ type, label, description, icon: Icon }) => (
            <div
              key={type}
              draggable
              onDragStart={(e) => handleDragStart(e, type)}
              className="cursor-move border rounded-lg p-3 hover:bg-accent transition-colors bg-card"
            >
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                <div className="text-left flex-1 min-w-0">
                  <div className="font-medium text-sm">{label}</div>
                  <div className="text-xs text-muted-foreground">{description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

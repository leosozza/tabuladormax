// ============================================
// Custom Node - Generic node for new types
// ============================================

import { Handle, Position, NodeProps } from 'reactflow';
import { 
  Globe, 
  MessageSquare, 
  Clock, 
  GitBranch, 
  UserCog, 
  Tag, 
  UserPlus, 
  Users 
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const nodeIcons = {
  send_message: MessageSquare,
  http_request: Globe,
  schedule_message: Clock,
  condition: GitBranch,
  update_contact: UserCog,
  add_label: Tag,
  assign_agent: UserPlus,
  assign_team: Users,
  // New types
  bitrix_get_field: Globe,
  gupshup_send_text: MessageSquare,
  gupshup_send_image: MessageSquare,
  gupshup_send_buttons: MessageSquare,
};

const nodeLabels = {
  send_message: 'Enviar Mensagem',
  http_request: 'HTTP Request',
  schedule_message: 'Agendar Mensagem',
  condition: 'Condição',
  update_contact: 'Atualizar Contato',
  add_label: 'Adicionar Label',
  assign_agent: 'Atribuir Agente',
  assign_team: 'Atribuir Time',
  // New types
  bitrix_get_field: 'Buscar Campo Bitrix',
  gupshup_send_text: 'WhatsApp: Texto',
  gupshup_send_image: 'WhatsApp: Imagem',
  gupshup_send_buttons: 'WhatsApp: Botões',
};

export function CustomNode({ data, selected }: NodeProps) {
  const Icon = nodeIcons[data.type as keyof typeof nodeIcons] || Globe;
  const label = nodeLabels[data.type as keyof typeof nodeLabels] || data.nome || data.type;

  return (
    <>
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-primary" />
      <Card
        className={cn(
          'p-4 min-w-[200px] border-2 cursor-pointer transition-all',
          selected ? 'border-primary shadow-lg' : 'border-border hover:border-primary/50'
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4" />
          <Badge variant="secondary" className="text-xs">
            {label}
          </Badge>
        </div>
        {data.nome && <h4 className="font-semibold text-sm mb-1">{data.nome}</h4>}
        {data.descricao && (
          <p className="text-xs text-muted-foreground line-clamp-2">{data.descricao}</p>
        )}
        <div className="text-xs text-muted-foreground mt-2">
          {getNodeDescription(data)}
        </div>
      </Card>
      {data.type === 'condition' ? (
        <>
          <Handle type="source" position={Position.Bottom} id="true" className="!left-[30%] w-3 h-3 !bg-green-500" />
          <Handle type="source" position={Position.Bottom} id="false" className="!left-[70%] w-3 h-3 !bg-red-500" />
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-primary" />
      )}
    </>
  );
}

function getNodeDescription(data: any): string {
  const config = data.config || {};
  
  switch (data.type) {
    case 'send_message':
      return config.message ? `"${config.message.substring(0, 30)}..."` : 'Configure mensagem';
    case 'http_request':
      return `${config.method || 'GET'} ${config.url || 'URL'}`;
    case 'schedule_message':
      return `Delay: ${config.delayMinutes || 0}min`;
    case 'condition':
      return `${config.conditions?.length || 0} condição(ões)`;
    case 'update_contact':
      return Object.keys(config.custom_attributes || {}).length > 0
        ? `${Object.keys(config.custom_attributes).length} campo(s)`
        : 'Configure campos';
    case 'add_label':
      return config.labels?.length > 0 ? `${config.labels.length} label(s)` : 'Configure labels';
    case 'assign_agent':
      return config.agentId ? `Agent: ${config.agentId}` : 'Selecione agente';
    case 'assign_team':
      return config.teamId ? `Team: ${config.teamId}` : 'Selecione time';
    // New types
    case 'bitrix_get_field':
      return config.field_name ? `Campo: ${config.field_name}` : 'Configure campo';
    case 'gupshup_send_text':
      return config.text ? `"${config.text.substring(0, 25)}..."` : 'Configure texto';
    case 'gupshup_send_image':
      return config.caption ? `"${config.caption.substring(0, 25)}..."` : 'Imagem';
    case 'gupshup_send_buttons':
      return config.buttons?.length > 0 ? `${config.buttons.length} botão(ões)` : 'Configure botões';
    default:
      return '';
  }
}

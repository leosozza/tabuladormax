import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AgentConversation } from '@/hooks/useAgentConversations';
import { LabelBadge } from './LabelBadge';
import { LabelAssignment } from '@/hooks/useConversationLabels';
import { WindowIndicator } from './WindowIndicator';

interface ConversationItemProps {
  conversation: AgentConversation;
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
  isActive: boolean;
  labels?: LabelAssignment[];
}

// Helper para extrair URL da foto do lead
function getLeadPhotoUrl(photoUrl: string | null): string | null {
  if (!photoUrl) return null;
  
  try {
    // Se é um JSON array, extrair primeira foto
    if (photoUrl.startsWith('[')) {
      const photos = JSON.parse(photoUrl);
      if (photos.length > 0 && photos[0].showUrl) {
        // Adicionar domínio do Bitrix
        return `https://maxsystem.bitrix24.com.br${photos[0].showUrl}`;
      }
    }
    // Se já é uma URL direta
    if (photoUrl.startsWith('http')) {
      return photoUrl;
    }
  } catch {
    // Se falhar o parse, retornar null
  }
  return null;
}

export function ConversationItem({
  conversation,
  selected,
  onSelect,
  onClick,
  isActive,
  labels = [],
}: ConversationItemProps) {
  const initials = (conversation.lead_name || 'NN')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  // Priorizar foto do lead, depois thumbnail do chatwoot
  const avatarUrl = getLeadPhotoUrl(conversation.photo_url) || conversation.thumbnail;

  const timeAgo = conversation.last_message_at
    ? formatDistanceToNow(new Date(conversation.last_message_at), {
        addSuffix: true,
        locale: ptBR,
      })
    : 'Sem atividade';

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b transition-colors',
        isActive && 'bg-muted'
      )}
      onClick={onClick}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={onSelect}
        onClick={(e) => e.stopPropagation()}
        className="flex-shrink-0"
      />
      
      {/* Indicador de janela 24h */}
      <WindowIndicator status={conversation.windowStatus} variant="dot" />
      
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={avatarUrl || undefined} alt={conversation.nome_modelo} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm truncate">
            <span className="text-muted-foreground">Nome:</span>{' '}
            <span className="font-bold">{conversation.lead_name}</span>
            {' - '}
            <span className="text-muted-foreground">Resp:</span>{' '}
            <span>{conversation.responsible}</span>
          </h4>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {timeAgo}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {conversation.phone_number}
        </p>
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {labels.map((assignment) => {
              const label = assignment.label;
              if (!label) return null;
              return (
                <LabelBadge
                  key={assignment.id}
                  name={label.name}
                  color={label.color}
                  size="sm"
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

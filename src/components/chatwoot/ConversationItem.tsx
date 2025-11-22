import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AgentConversation } from '@/hooks/useAgentConversations';

interface ConversationItemProps {
  conversation: AgentConversation;
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
  isActive: boolean;
}

export function ConversationItem({
  conversation,
  selected,
  onSelect,
  onClick,
  isActive,
}: ConversationItemProps) {
  const initials = conversation.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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
      
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={conversation.thumbnail || undefined} alt={conversation.name} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm truncate">{conversation.name}</h4>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {timeAgo}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {conversation.phone_number}
        </p>
      </div>
    </div>
  );
}

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AgentConversation } from '@/hooks/useAgentConversations';
import { LabelAssignment } from '@/hooks/useConversationLabels';
import { LabelBadge } from './LabelBadge';

interface ConversationKanbanCardProps {
  conversation: AgentConversation;
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
  isActive: boolean;
  labels?: LabelAssignment[];
  hasNewMessage?: boolean;
}

function getLeadPhotoUrl(photoUrl: string | null): string | null {
  if (!photoUrl) return null;
  try {
    if (photoUrl.startsWith('[')) {
      const photos = JSON.parse(photoUrl);
      if (photos.length > 0 && photos[0].showUrl) {
        return `https://maxsystem.bitrix24.com.br${photos[0].showUrl}`;
      }
    }
    if (photoUrl.startsWith('http')) {
      return photoUrl;
    }
  } catch {
    // ignore
  }
  return null;
}

export function ConversationKanbanCard({
  conversation,
  selected,
  onSelect,
  onClick,
  isActive,
  labels = [],
  hasNewMessage = false,
}: ConversationKanbanCardProps) {
  const initials = (conversation.lead_name || 'NN')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  const avatarUrl = getLeadPhotoUrl(conversation.photo_url) || conversation.thumbnail;

  const timeAgo = conversation.last_message_at
    ? formatDistanceToNow(new Date(conversation.last_message_at), {
        addSuffix: false,
        locale: ptBR,
      })
    : '-';

  return (
    <div
      className={cn(
        'p-2 rounded-md border bg-card hover:bg-muted/50 cursor-pointer transition-all',
        isActive && 'ring-2 ring-primary',
        hasNewMessage && 'animate-new-message'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <Checkbox
          checked={selected}
          onCheckedChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 flex-shrink-0"
        />
        
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{conversation.lead_name}</p>
          <p className="text-xs text-muted-foreground truncate">{conversation.phone_number}</p>
          <p className="text-xs text-muted-foreground">{timeAgo}</p>
          
          {labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {labels.slice(0, 2).map((assignment) => {
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
              {labels.length > 2 && (
                <span className="text-xs text-muted-foreground">+{labels.length - 2}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

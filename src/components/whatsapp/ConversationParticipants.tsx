import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useConversationParticipants } from '@/hooks/useConversationParticipants';
import { Users } from 'lucide-react';

interface ConversationParticipantsProps {
  phoneNumber: string | undefined;
  maxVisible?: number;
}

export function ConversationParticipants({
  phoneNumber,
  maxVisible = 3,
}: ConversationParticipantsProps) {
  const { data: participants = [] } = useConversationParticipants(phoneNumber);

  if (participants.length === 0) return null;

  const visibleParticipants = participants.slice(0, maxVisible);
  const remainingCount = participants.length - maxVisible;

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center -space-x-2">
          {visibleParticipants.map((participant) => (
            <Avatar key={participant.id} className="h-6 w-6 border-2 border-background">
              <AvatarImage src={participant.operator?.photo_url || undefined} />
              <AvatarFallback className="text-[10px] bg-primary/10">
                {getInitials(participant.operator?.full_name)}
              </AvatarFallback>
            </Avatar>
          ))}
          {remainingCount > 0 && (
            <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
              <span className="text-[10px] font-medium">+{remainingCount}</span>
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs font-medium mb-2">
            <Users className="h-3 w-3" />
            Participantes ({participants.length})
          </div>
          {participants.map((participant) => (
            <div key={participant.id} className="text-xs">
              {participant.operator?.full_name || 'Sem nome'}
              {participant.role === 'owner' && (
                <span className="text-muted-foreground ml-1">(proprietário)</span>
              )}
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

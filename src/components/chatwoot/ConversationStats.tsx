import { MessageCircle, Clock, CheckCircle2 } from 'lucide-react';
import { AgentConversation } from '@/hooks/useAgentConversations';

interface ConversationStatsProps {
  conversations: AgentConversation[];
}

export function ConversationStats({ conversations }: ConversationStatsProps) {
  const total = conversations.length;
  
  const recentlyActive = conversations.filter(c => {
    if (!c.last_message_at) return false;
    const lastMessage = new Date(c.last_message_at);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return lastMessage > hourAgo;
  }).length;

  const withActivity = conversations.filter(c => c.last_message_at).length;

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1.5">
        <MessageCircle className="h-4 w-4 text-primary" />
        <span className="font-semibold">{total}</span>
        <span className="text-muted-foreground text-xs">total</span>
      </div>
      
      <div className="flex items-center gap-1.5">
        <Clock className="h-4 w-4 text-orange-500" />
        <span className="font-semibold">{recentlyActive}</span>
        <span className="text-muted-foreground text-xs">1h</span>
      </div>
      
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <span className="font-semibold">{withActivity}</span>
        <span className="text-muted-foreground text-xs">ativos</span>
      </div>
    </div>
  );
}

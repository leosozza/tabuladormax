import { Card, CardContent } from '@/components/ui/card';
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
    <div className="grid grid-cols-3 gap-3 mb-4">
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold">{total}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            <div>
              <p className="text-xs text-muted-foreground">Última hora</p>
              <p className="text-lg font-bold">{recentlyActive}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Com atividade</p>
              <p className="text-lg font-bold">{withActivity}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

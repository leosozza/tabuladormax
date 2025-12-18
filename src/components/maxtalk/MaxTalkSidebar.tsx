import { useState } from 'react';
import { Search, Plus, Users, MessageCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MaxTalkConversation } from '@/types/maxtalk';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MaxTalkSidebarProps {
  conversations: MaxTalkConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  loading?: boolean;
}

export function MaxTalkSidebar({ 
  conversations, 
  selectedId, 
  onSelect, 
  onNewChat,
  loading 
}: MaxTalkSidebarProps) {
  const [search, setSearch] = useState('');

  const filteredConversations = conversations.filter(conv => {
    const name = conv.type === 'private' 
      ? conv.other_member?.display_name || 'Usuário'
      : conv.name || 'Grupo';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
      return 'Ontem';
    }
    return format(date, 'dd/MM', { locale: ptBR });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            MaxTalk
          </h2>
          <Button size="icon" variant="ghost" onClick={onNewChat}>
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma conversa ainda</p>
            <Button variant="link" onClick={onNewChat} className="mt-2">
              Iniciar uma conversa
            </Button>
          </div>
        ) : (
          <div className="p-2">
            {filteredConversations.map((conv) => {
              const isPrivate = conv.type === 'private';
              const name = isPrivate 
                ? conv.other_member?.display_name || 'Usuário'
                : conv.name || 'Grupo';
              const avatar = isPrivate 
                ? conv.other_member?.avatar_url 
                : conv.avatar_url;
              const lastMessage = conv.last_message;
              
              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                    selectedId === conv.id 
                      ? "bg-primary/10 text-primary" 
                      : "hover:bg-muted"
                  )}
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={avatar || undefined} />
                      <AvatarFallback className={cn(
                        isPrivate ? "bg-primary/20" : "bg-accent"
                      )}>
                        {isPrivate ? getInitials(name) : <Users className="w-5 h-5" />}
                      </AvatarFallback>
                    </Avatar>
                    {!isPrivate && (
                      <div className="absolute -bottom-1 -right-1 bg-accent text-accent-foreground rounded-full p-0.5">
                        <Users className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{name}</span>
                      {lastMessage && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatMessageTime(lastMessage.created_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground truncate">
                        {lastMessage?.content || 'Nenhuma mensagem'}
                      </p>
                      {(conv.unread_count || 0) > 0 && (
                        <Badge variant="default" className="shrink-0 h-5 min-w-5 flex items-center justify-center">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

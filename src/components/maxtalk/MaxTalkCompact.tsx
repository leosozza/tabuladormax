import { useState, useRef, useEffect } from 'react';
import { Search, Plus, ArrowLeft, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MaxTalkConversation, MaxTalkMessage } from '@/types/maxtalk';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface MaxTalkCompactProps {
  conversations: MaxTalkConversation[];
  selectedConversation: MaxTalkConversation | null;
  messages: MaxTalkMessage[];
  messagesLoading: boolean;
  onSelectConversation: (id: string) => void;
  onSendMessage: (content: string) => Promise<boolean>;
  onNewChat: () => void;
}

export default function MaxTalkCompact({
  conversations,
  selectedConversation,
  messages,
  messagesLoading,
  onSelectConversation,
  onSendMessage,
  onNewChat,
}: MaxTalkCompactProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const name = conv.type === 'group' ? conv.name : conv.members?.[0]?.profile?.display_name;
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;
    setIsSending(true);
    const success = await onSendMessage(newMessage);
    if (success) {
      setNewMessage('');
    }
    setIsSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getConversationName = (conv: MaxTalkConversation) => {
    if (conv.type === 'group') return conv.name || 'Grupo';
    return conv.members?.find(m => m.user_id !== currentUserId)?.profile?.display_name || 'Usuário';
  };

  const formatTime = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  };

  // Show conversation list
  if (!selectedConversation) {
    return (
      <div className="h-full flex flex-col">
        {/* Search header */}
        <div className="p-2 border-b border-border flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-7 text-sm"
            />
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNewChat}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Conversations list */}
        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              Nenhuma conversa
            </div>
          ) : (
            <div className="py-1">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
                  )}
                >
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(getConversationName(conv))}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium text-sm truncate">
                        {getConversationName(conv)}
                      </span>
                      {conv.last_message && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatTime(conv.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs text-muted-foreground truncate">
                        {conv.last_message?.content || 'Sem mensagens'}
                      </span>
                      {(conv.unread_count || 0) > 0 && (
                        <Badge variant="destructive" className="h-4 text-[10px] px-1 flex-shrink-0">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }

  // Show chat view
  return (
    <div className="h-full flex">
      {/* Collapsible sidebar */}
      <div className={cn(
        "border-r border-border transition-all duration-200 flex flex-col",
        sidebarCollapsed ? "w-0 overflow-hidden" : "w-[140px]"
      )}>
        <ScrollArea className="flex-1">
          <div className="py-1">
            {conversations.slice(0, 10).map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 transition-colors",
                  conv.id === selectedConversation.id && "bg-muted"
                )}
              >
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {getInitials(getConversationName(conv))}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs truncate flex-1">
                  {getConversationName(conv)}
                </span>
                {(conv.unread_count || 0) > 0 && (
                  <Badge variant="destructive" className="h-4 text-[10px] px-1">
                    {conv.unread_count}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border bg-muted/30">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {getInitials(getConversationName(selectedConversation))}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{getConversationName(selectedConversation)}</p>
            {selectedConversation.type === 'group' && (
              <p className="text-[10px] text-muted-foreground">
                {selectedConversation.members?.length || 0} membros
              </p>
            )}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-2">
          {messagesLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Nenhuma mensagem
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => {
                const isOwn = msg.sender_id === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      isOwn ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-2.5 py-1.5 text-sm",
                        isOwn
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {!isOwn && selectedConversation.type === 'group' && (
                        <p className="text-[10px] font-medium text-primary mb-0.5">
                          {msg.sender?.display_name}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={cn(
                        "text-[10px] mt-0.5",
                        isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Digite uma mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm"
              disabled={isSending}
            />
            <Button
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={handleSend}
              disabled={!newMessage.trim() || isSending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

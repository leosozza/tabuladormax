import { useEffect, useRef, useState } from 'react';
import { Users, Phone, Video, MoreVertical, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MaxTalkConversation, MaxTalkMessage } from '@/types/maxtalk';
import { MaxTalkMessageBubble } from './MaxTalkMessageBubble';
import { MaxTalkInput } from './MaxTalkInput';
import { supabase } from '@/integrations/supabase/client';

interface MaxTalkChatAreaProps {
  conversation: MaxTalkConversation | null;
  messages: MaxTalkMessage[];
  loading?: boolean;
  onSendMessage: (content: string) => Promise<boolean>;
  onDeleteMessage: (id: string) => Promise<boolean>;
}

export function MaxTalkChatArea({ 
  conversation, 
  messages, 
  loading,
  onSendMessage,
  onDeleteMessage
}: MaxTalkChatAreaProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center text-muted-foreground">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-1">MaxTalk</h3>
          <p className="text-sm">Selecione uma conversa ou inicie uma nova</p>
        </div>
      </div>
    );
  }

  const isPrivate = conversation.type === 'private';
  const name = isPrivate 
    ? conversation.other_member?.display_name || 'Usuário'
    : conversation.name || 'Grupo';
  const avatar = isPrivate 
    ? conversation.other_member?.avatar_url 
    : conversation.avatar_url;
  const memberCount = conversation.members?.length || 0;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={avatar || undefined} />
            <AvatarFallback>
              {isPrivate ? getInitials(name) : <Users className="w-5 h-5" />}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{name}</h3>
            <p className="text-xs text-muted-foreground">
              {isPrivate ? 'Online' : `${memberCount} membros`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost">
            <Phone className="w-5 h-5" />
          </Button>
          <Button size="icon" variant="ghost">
            <Video className="w-5 h-5" />
          </Button>
          <Button size="icon" variant="ghost">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`flex ${i % 2 ? 'justify-end' : 'justify-start'}`}>
                <div className="flex gap-2 max-w-[70%]">
                  {i % 2 === 0 && <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />}
                  <div className="space-y-1">
                    <div className={`h-16 bg-muted rounded-lg animate-pulse ${i % 2 ? 'w-48' : 'w-64'}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma mensagem ainda</p>
              <p className="text-xs mt-1">Envie a primeira mensagem!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isOwn = message.sender_id === currentUserId;
              const showAvatar = !isOwn && (
                index === 0 || 
                messages[index - 1].sender_id !== message.sender_id
              );
              
              return (
                <MaxTalkMessageBubble
                  key={message.id}
                  message={message}
                  isOwn={isOwn}
                  showAvatar={showAvatar}
                  onDelete={() => onDeleteMessage(message.id)}
                />
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <MaxTalkInput onSend={onSendMessage} />
    </div>
  );
}

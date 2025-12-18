import { useState } from 'react';
import { MoreHorizontal, Trash2, Edit, Check, CheckCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MaxTalkMessage } from '@/types/maxtalk';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface MaxTalkMessageBubbleProps {
  message: MaxTalkMessage;
  isOwn: boolean;
  showAvatar: boolean;
  onDelete: () => void;
}

export function MaxTalkMessageBubble({ 
  message, 
  isOwn, 
  showAvatar,
  onDelete 
}: MaxTalkMessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const senderName = message.sender?.display_name || 'Usuário';

  return (
    <div 
      className={cn("flex gap-2 group", isOwn ? "justify-end" : "justify-start")}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar (for others) */}
      {!isOwn && (
        <div className="w-8 shrink-0">
          {showAvatar && (
            <Avatar className="w-8 h-8">
              <AvatarImage src={message.sender?.avatar_url || undefined} />
              <AvatarFallback className="text-xs bg-muted">
                {getInitials(senderName)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      {/* Message bubble */}
      <div className={cn("max-w-[70%] relative", isOwn && "order-first")}>
        {/* Sender name (for groups) */}
        {!isOwn && showAvatar && (
          <span className="text-xs text-muted-foreground ml-1 mb-1 block">
            {senderName}
          </span>
        )}
        
        <div
          className={cn(
            "px-4 py-2 rounded-2xl relative",
            isOwn 
              ? "bg-primary text-primary-foreground rounded-tr-sm" 
              : "bg-muted rounded-tl-sm"
          )}
        >
          {/* Content */}
          {message.message_type === 'text' ? (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          ) : message.message_type === 'image' ? (
            <img 
              src={message.media_url || ''} 
              alt="Imagem" 
              className="max-w-full rounded-lg"
            />
          ) : (
            <a 
              href={message.media_url || ''} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm underline"
            >
              📎 {message.content}
            </a>
          )}

          {/* Time and status */}
          <div className={cn(
            "flex items-center justify-end gap-1 mt-1",
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            <span className="text-[10px]">
              {format(new Date(message.created_at), 'HH:mm')}
            </span>
            {message.edited_at && (
              <span className="text-[10px] italic">editado</span>
            )}
            {isOwn && (
              <CheckCheck className="w-3 h-3" />
            )}
          </div>
        </div>

        {/* Actions dropdown */}
        {isOwn && showActions && (
          <div className="absolute -left-8 top-1/2 -translate-y-1/2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Apagar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}

import { User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export function AgentChatMessage({ role, content, timestamp }: AgentChatMessageProps) {
  const isUser = role === 'user';
  
  return (
    <div className={cn(
      "flex gap-3 mb-4",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isUser ? "bg-primary" : "bg-accent"
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-primary-foreground" />
        ) : (
          <Bot className="w-4 h-4 text-accent-foreground" />
        )}
      </div>
      
      <div className={cn(
        "flex flex-col max-w-[80%]",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "rounded-lg px-4 py-2 shadow-sm",
          isUser 
            ? "bg-primary text-primary-foreground" 
            : "bg-card border border-border text-card-foreground"
        )}>
          <div className="whitespace-pre-wrap break-words text-sm">
            {content}
          </div>
        </div>
        
        {timestamp && (
          <span className="text-xs text-muted-foreground mt-1 px-1">
            {timestamp.toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        )}
      </div>
    </div>
  );
}

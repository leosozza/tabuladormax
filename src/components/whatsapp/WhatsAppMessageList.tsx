import { useRef, useEffect } from 'react';
import { MessageSquare, Cloud, Info } from 'lucide-react';
import { WhatsAppMessage } from '@/hooks/useWhatsAppMessages';
import { WhatsAppMessageBubble } from './WhatsAppMessageBubble';

interface WhatsAppMessageListProps {
  messages: WhatsAppMessage[];
  loading?: boolean;
  usingBitrixFallback?: boolean;
}

export function WhatsAppMessageList({ messages, loading, usingBitrixFallback }: WhatsAppMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      const lastMessage = scrollRef.current.lastElementChild;
      if (lastMessage) {
        lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }, [messages]);

  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground text-sm">Carregando mensagens...</div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <MessageSquare className="w-12 h-12 text-muted-foreground mb-2" />
        <p className="text-muted-foreground text-sm">Nenhuma mensagem ainda</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4" ref={scrollRef}>
      {/* Banner quando usando histórico do Bitrix */}
      {usingBitrixFallback && (
        <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-700 dark:text-blue-400 text-sm">
          <Cloud className="w-4 h-4 shrink-0" />
          <div className="flex-1">
            <span className="font-medium">Histórico do Bitrix</span>
            <span className="text-blue-600/80 dark:text-blue-400/80 ml-1">
              - Mensagens recuperadas do Open Line
            </span>
          </div>
          <Info className="w-4 h-4 shrink-0 opacity-60" />
        </div>
      )}
      
      {messages.map((msg) => (
        <WhatsAppMessageBubble key={msg.id} message={msg} />
      ))}
    </div>
  );
}

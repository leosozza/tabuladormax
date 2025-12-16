import { useRef, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { WhatsAppMessage } from '@/hooks/useWhatsAppMessages';
import { WhatsAppMessageBubble } from './WhatsAppMessageBubble';

interface WhatsAppMessageListProps {
  messages: WhatsAppMessage[];
  loading?: boolean;
}

export function WhatsAppMessageList({ messages, loading }: WhatsAppMessageListProps) {
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
      {messages.map((msg) => (
        <WhatsAppMessageBubble key={msg.id} message={msg} />
      ))}
    </div>
  );
}

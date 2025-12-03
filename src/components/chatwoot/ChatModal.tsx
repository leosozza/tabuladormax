import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, RefreshCw, MessageSquare } from 'lucide-react';
import { useChatwootMessages } from '@/hooks/useChatwootMessages';
import { TemplateSelector } from './TemplateSelector';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: number | null;
  contactName: string;
}

export const ChatModal = ({
  open,
  onOpenChange,
  conversationId,
  contactName,
}: ChatModalProps) => {
  const [messageInput, setMessageInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    loading,
    sending,
    fetchMessages,
    sendMessage,
    sendTemplate,
  } = useChatwootMessages(conversationId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    
    const success = await sendMessage(messageInput);
    if (success) {
      setMessageInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Chat com {contactName}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="messages" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="messages">Mensagens</TabsTrigger>
            <TabsTrigger value="templates">Templates WhatsApp</TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="flex-1 flex flex-col min-h-0 gap-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {conversationId ? `Conversa #${conversationId}` : 'Sem conversa ativa'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMessages}
                disabled={loading || !conversationId}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>

            <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
              <div className="space-y-4">
                {loading && messages.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <div className="text-muted-foreground">Carregando mensagens...</div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Nenhuma mensagem ainda</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.message_type === 1 ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          msg.message_type === 1
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="text-sm font-medium mb-1">
                          {msg.sender?.name || (msg.message_type === 1 ? 'Você' : 'Cliente')}
                        </div>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {msg.attachments.map((att, idx) => (
                              <a
                                key={idx}
                                href={att.data_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs underline"
                              >
                                📎 {att.file_type}
                              </a>
                            ))}
                          </div>
                        )}
                        <div className="text-xs opacity-70 mt-1">
                          {format(new Date(msg.created_at * 1000), 'dd/MM/yy HH:mm', {
                            locale: ptBR,
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="flex gap-2">
              <Input
                placeholder="Digite sua mensagem..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={sending || !conversationId}
              />
              <Button
                onClick={handleSendMessage}
                disabled={sending || !messageInput.trim() || !conversationId}
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="flex-1 overflow-auto">
            <TemplateSelector
              onSendTemplate={sendTemplate}
              disabled={sending || !conversationId}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

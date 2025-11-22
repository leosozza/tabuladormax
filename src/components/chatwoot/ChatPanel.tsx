import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, RefreshCw, MessageSquare } from 'lucide-react';
import { useChatwootMessages } from '@/hooks/useChatwootMessages';
import { TemplateSelector } from './TemplateSelector';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatPanelProps {
  conversationId: number | null;
  contactName: string;
}

export function ChatPanel({ conversationId, contactName }: ChatPanelProps) {
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

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Selecione uma conversa</h3>
          <p className="text-sm text-muted-foreground">
            Escolha uma conversa à esquerda para começar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4 bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{contactName}</h2>
            <p className="text-xs text-muted-foreground">
              Conversa #{conversationId}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMessages}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Content */}
      <Tabs defaultValue="messages" className="flex-1 flex flex-col min-h-0">
        <div className="border-b px-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="messages">Mensagens</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="messages" className="flex-1 flex flex-col min-h-0 mt-0">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
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
                      msg.message_type === 'outgoing' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        msg.message_type === 'outgoing'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="text-sm font-medium mb-1">
                        {msg.sender?.name || (msg.message_type === 'outgoing' ? 'Você' : 'Cliente')}
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

          <div className="border-t p-4 bg-card">
            <div className="flex gap-2">
              <Input
                placeholder="Digite sua mensagem..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={sending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={sending || !messageInput.trim()}
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="flex-1 overflow-auto p-4 mt-0">
          <TemplateSelector
            onSendTemplate={sendTemplate}
            disabled={sending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

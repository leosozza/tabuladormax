import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, RefreshCw, MessageSquare, ArrowLeft } from 'lucide-react';
import { useChatwootMessages } from '@/hooks/useChatwootMessages';
import { TemplateSelector } from './TemplateSelector';
import { LabelManager } from './LabelManager';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatPanelProps {
  conversationId: number | null;
  contactName: string;
  onBack?: () => void;
}

export function ChatPanel({ conversationId, contactName, onBack }: ChatPanelProps) {
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

  // Limpar data-scroll-locked ao montar/desmontar
  useEffect(() => {
    const clearScrollLock = () => {
      document.body.removeAttribute('data-scroll-locked');
      document.body.style.removeProperty('pointer-events');
    };
    
    clearScrollLock();
    return () => clearScrollLock();
  }, []);

  // Scroll automático para o final quando mensagens mudarem
  useEffect(() => {
    if (scrollRef.current) {
      const lastMessage = scrollRef.current.lastElementChild;
      if (lastMessage) {
        lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    
    const success = await sendMessage(messageInput);
    if (success) {
      setMessageInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter ou Cmd+Enter para enviar
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendMessage();
    }
    // Enter simples adiciona nova linha (comportamento padrão do textarea)
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
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h2 className="text-lg font-semibold">{contactName}</h2>
              <p className="text-xs text-muted-foreground">
                Conversa #{conversationId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LabelManager conversationId={conversationId} />
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMessages}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline ml-2">Atualizar</span>
            </Button>
          </div>
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
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4" ref={scrollRef}>
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
            <div className="flex gap-2 items-end">
              <Textarea
                placeholder="Digite sua mensagem... (Ctrl+Enter para enviar)"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={sending}
                className="min-h-[80px] max-h-[160px] resize-none"
                rows={3}
              />
              <Button
                onClick={handleSendMessage}
                disabled={sending || !messageInput.trim()}
                size="icon"
                className="flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Pressione <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+Enter</kbd> para enviar
            </p>
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

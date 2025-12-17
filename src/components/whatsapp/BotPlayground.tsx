import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bot, Send, RefreshCw, User, Loader2, Sparkles } from 'lucide-react';
import { useTestBot, useBotConfig } from '@/hooks/useWhatsAppBot';
import { cn } from '@/lib/utils';

interface BotPlaygroundProps {
  projectId: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  responseTime?: number;
  tokensUsed?: number;
}

export function BotPlayground({ projectId }: BotPlaygroundProps) {
  const { data: config } = useBotConfig(projectId);
  const testBot = useTestBot();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || testBot.isPending) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const result = await testBot.mutateAsync({
        message: input.trim(),
        projectId,
        conversationHistory,
      });

      const botMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.response || 'Sem resposta',
        timestamp: new Date(),
        responseTime: result.response_time_ms,
        tokensUsed: result.tokens_used,
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error testing bot:', error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Erro ao processar mensagem. Verifique as configurações.',
        timestamp: new Date(),
      }]);
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  const QUICK_MESSAGES = [
    'Olá, quero saber mais',
    'Qual o preço?',
    'Como funciona?',
    'Quero falar com atendente',
    'Obrigado!',
  ];

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Playground de Teste</CardTitle>
              <CardDescription>
                Teste o bot antes de ativar para clientes
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleClear}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Limpar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col overflow-hidden p-4 pt-0">
        {/* Info do Bot */}
        {config && (
          <div className="flex items-center gap-2 mb-3 pb-3 border-b">
            <Badge variant="outline">{config.bot_name}</Badge>
            <Badge variant="secondary">{config.personality}</Badge>
            <Badge variant={config.is_enabled ? 'default' : 'destructive'}>
              {config.is_enabled ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        )}

        {/* Área de Mensagens */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Envie uma mensagem para testar o bot</p>
                <p className="text-sm mt-1">O bot responderá como se fosse um cliente real</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="p-2 rounded-full bg-primary/10 h-fit">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  
                  <div className={cn(
                    "max-w-[80%] rounded-lg p-3",
                    message.role === 'user' 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted"
                  )}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <div className={cn(
                      "flex items-center gap-2 mt-1 text-xs",
                      message.role === 'user' ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      <span>
                        {message.timestamp.toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                      {message.responseTime && (
                        <span>• {message.responseTime}ms</span>
                      )}
                      {message.tokensUsed && (
                        <span>• {message.tokensUsed} tokens</span>
                      )}
                    </div>
                  </div>

                  {message.role === 'user' && (
                    <div className="p-2 rounded-full bg-muted h-fit">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))
            )}

            {testBot.isPending && (
              <div className="flex gap-3 justify-start">
                <div className="p-2 rounded-full bg-primary/10 h-fit">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Mensagens Rápidas */}
        <div className="flex flex-wrap gap-2 py-3 border-t mt-3">
          {QUICK_MESSAGES.map((msg) => (
            <Button
              key={msg}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setInput(msg)}
              disabled={testBot.isPending}
            >
              {msg}
            </Button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite uma mensagem de teste..."
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={testBot.isPending}
          />
          <Button onClick={handleSend} disabled={testBot.isPending || !input.trim()}>
            {testBot.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

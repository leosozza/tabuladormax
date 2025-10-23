import { useState, useEffect, useRef } from 'react';
import { Brain, Sparkles, X, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIAnalysisFloatingProps {
  data?: any;
  onAnalyze?: (data: any) => Promise<string>;
}

/**
 * Componente de Análise de IA Flutuante
 * 
 * Comportamento:
 * 1. Botão toggle no topo para ativar/desativar
 * 2. Quando ativo, mostra FAB no canto inferior direito
 * 3. FAB abre painel de análise
 */
export function AIAnalysisFloating({ data, onAnalyze }: AIAnalysisFloatingProps) {
  const { toast } = useToast();
  const [isActive, setIsActive] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Estado para posição arrastável
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Estado para posição do FAB
  const [fabPosition, setFabPosition] = useState({ x: window.innerWidth - 100, y: window.innerHeight - 100 });
  const [isFabDragging, setIsFabDragging] = useState(false);
  const [fabDragStart, setFabDragStart] = useState({ x: 0, y: 0 });

  // Handlers de arrastar FAB (apenas com botão direito)
  const handleFabMouseDown = (e: React.MouseEvent) => {
    // Botão direito (2) = arrastar
    if (e.button === 2) {
      e.preventDefault();
      e.stopPropagation();
      setIsFabDragging(true);
      setFabDragStart({
        x: e.clientX - fabPosition.x,
        y: e.clientY - fabPosition.y
      });
    }
  };

  const handleFabMouseMove = (e: MouseEvent) => {
    if (!isFabDragging) return;
    
    const newX = e.clientX - fabDragStart.x;
    const newY = e.clientY - fabDragStart.y;
    
    // Limites da tela
    const maxX = window.innerWidth - 80;
    const maxY = window.innerHeight - 80;
    
    setFabPosition({
      x: Math.max(20, Math.min(maxX, newX)),
      y: Math.max(20, Math.min(maxY, newY))
    });
  };

  const handleFabMouseUp = () => {
    setIsFabDragging(false);
  };
  
  // Prevenir menu de contexto no botão
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };
  
  const handleFabClick = () => {
    setIsPanelOpen(true);
  };

  // Handlers de arrastar painel
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Limites da tela
    const maxX = window.innerWidth - 400; // largura do card
    const maxY = window.innerHeight - 600; // altura estimada do card
    
    setPosition({
      x: Math.max(-maxX, Math.min(0, newX)),
      y: Math.max(-maxY, Math.min(0, newY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Event listeners para arrastar
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, position]);
  
  useEffect(() => {
    if (isFabDragging) {
      window.addEventListener('mousemove', handleFabMouseMove);
      window.addEventListener('mouseup', handleFabMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleFabMouseMove);
        window.removeEventListener('mouseup', handleFabMouseUp);
      };
    }
  }, [isFabDragging, fabDragStart, fabPosition]);

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Enviar mensagem para o chat
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
      
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          pageData: data
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast({
            title: "Limite excedido",
            description: "Muitas requisições. Aguarde um momento.",
            variant: "destructive",
          });
          setMessages(prev => prev.slice(0, -1));
          return;
        }
        if (response.status === 402) {
          toast({
            title: "Créditos insuficientes",
            description: "Adicione créditos na sua workspace Lovable.",
            variant: "destructive",
          });
          setMessages(prev => prev.slice(0, -1));
          return;
        }
        throw new Error('Erro ao processar mensagem');
      }

      // Processar stream SSE
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let textBuffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          textBuffer += decoder.decode(value, { stream: true });
          let newlineIndex: number;

          while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') break;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                assistantMessage += content;
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'assistant') {
                    return prev.map((m, i) => 
                      i === prev.length - 1 ? { ...m, content: assistantMessage } : m
                    );
                  }
                  return [...prev, { role: 'assistant', content: assistantMessage }];
                });
              }
            } catch (e) {
              console.error('Error parsing SSE:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: "Erro",
        description: "Não foi possível processar sua mensagem.",
        variant: "destructive",
      });
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  // Botão superior (toggle)
  const TopToggleButton = () => (
    <button
      onClick={() => setIsActive(!isActive)}
      className={`flex items-center justify-center w-[30px] h-[30px] rounded transition-all duration-200 ${
        isActive 
          ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
          : 'hover:bg-accent text-muted-foreground'
      }`}
      title={isActive ? 'Desativar Análise IA' : 'Ativar Análise IA'}
    >
      <Brain size={16} className={isActive ? 'animate-pulse' : ''} />
    </button>
  );

  // FAB (Floating Action Button) - arrastável
  const FloatingButton = () => {
    if (!isActive) return null;

    return (
      <button
        onMouseDown={handleFabMouseDown}
        onClick={handleFabClick}
        onContextMenu={handleContextMenu}
        className="fixed w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center justify-center transition-all duration-300 ease-out hover:scale-110 active:scale-95 z-[9999]"
        style={{ 
          left: `${fabPosition.x}px`,
          top: `${fabPosition.y}px`,
          boxShadow: '0 4px 14px 0 rgba(0, 118, 255, 0.39)',
          cursor: 'pointer'
        }}
        title="Clique para abrir | Botão direito para arrastar"
      >
        <Sparkles size={28} className="drop-shadow-lg" />
      </button>
    );
  };

  // Painel de análise
  const AnalysisPanel = () => {
    if (!isPanelOpen) return null;

    // Calcular posição ao lado do botão
    const panelWidth = 400;
    const panelHeight = 600;
    
    // Tentar posicionar à esquerda do botão
    let panelX = fabPosition.x - panelWidth - 20;
    let panelY = fabPosition.y;
    
    // Se não couber à esquerda, coloca à direita
    if (panelX < 20) {
      panelX = fabPosition.x + 80 + 20;
    }
    
    // Se não couber à direita, centraliza
    if (panelX + panelWidth > window.innerWidth - 20) {
      panelX = Math.max(20, (window.innerWidth - panelWidth) / 2);
    }
    
    // Ajustar altura para não sair da tela
    if (panelY + panelHeight > window.innerHeight - 20) {
      panelY = Math.max(20, window.innerHeight - panelHeight - 20);
    }

    return (
      <Card 
        className="fixed w-full max-w-md max-h-[80vh] pointer-events-auto shadow-2xl z-[10000]"
        style={{
          left: `${panelX}px`,
          top: `${panelY}px`,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Chat de Análise</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Powered by Gemini AI</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsPanelOpen(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-0 flex flex-col h-[500px]">
          {/* Área de mensagens */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4 py-8">
                <Sparkles className="h-12 w-12 text-muted-foreground" />
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium">Olá! Como posso ajudar?</p>
                  <p className="text-xs text-muted-foreground">
                    Faça perguntas sobre os dados da página
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input de mensagem */}
          <div className="p-4 border-t">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua pergunta..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={isLoading || !input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
        </Card>
    );
  };

  return (
    <>
      <TopToggleButton />
      <FloatingButton />
      <AnalysisPanel />
    </>
  );
}

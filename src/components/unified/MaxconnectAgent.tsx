import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Trash2, Loader2 } from "lucide-react";
import { AgentChatMessage } from "./AgentChatMessage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  "Quantas leads foram feitas hoje?",
  "Quantas leads no projeto Seletiva Pinheiros?",
  "Separa por scouter o último mês",
  "Quantas leads confirmaram esse mês?",
  "Qual a taxa de comparecimento?",
];

export function MaxconnectAgent() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Olá! Sou o Agente MAXconnect. Posso te ajudar a analisar dados de leads, projetos e performance dos scouters. O que você gostaria de saber?',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Preparar histórico de mensagens para a API
      const apiMessages = messages
        .filter(m => m.role !== 'assistant' || m.content !== messages[0].content) // Remover mensagem inicial
        .map(m => ({
          role: m.role,
          content: m.content,
        }));
      
      apiMessages.push({
        role: 'user',
        content: input,
      });

      console.log('Sending to agent:', apiMessages.length, 'messages');

      const { data, error } = await supabase.functions.invoke('maxconnect-agent', {
        body: { messages: apiMessages }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message || 'Desculpe, não consegui processar sua pergunta.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error: any) {
      console.error('Error calling agent:', error);
      
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente em alguns instantes.',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar pergunta",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Olá! Sou o Agente MAXconnect. Posso te ajudar a analisar dados de leads, projetos e performance dos scouters. O que você gostaria de saber?',
        timestamp: new Date(),
      }
    ]);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-12rem)] max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h2 className="text-lg font-semibold">Agente MAXconnect</h2>
          <span className="text-xs text-muted-foreground">
            Análise de dados por IA
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={isLoading}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Limpar
        </Button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <AgentChatMessage
            key={idx}
            role={msg.role}
            content={msg.content}
            timestamp={msg.timestamp}
          />
        ))}
        
        {isLoading && (
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-accent-foreground animate-spin" />
            </div>
            <div className="text-sm text-muted-foreground">
              Analisando dados...
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground mb-2">Perguntas sugeridas:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={isLoading}
                className="text-xs"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua pergunta... (Enter para enviar)"
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

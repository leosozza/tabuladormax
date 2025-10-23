/**
 * AI Q&A Panel Component
 * Interactive question and answer interface for area analysis
 */
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Send, Loader2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

export interface QAMessage {
  id: string;
  type: 'question' | 'answer';
  content: string;
  timestamp: Date;
}

interface AIQAPanelProps {
  selectionHash: string;
  totalLeads: number;
  topProjetos: string[];
  topScouters: string[];
  densidade: string;
  onAskQuestion: (question: string) => Promise<string>;
}

export function AIQAPanel({
  selectionHash,
  totalLeads,
  topProjetos,
  topScouters,
  densidade,
  onAskQuestion,
}: AIQAPanelProps) {
  const [messages, setMessages] = useState<QAMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showInitialSummary, setShowInitialSummary] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousHashRef = useRef<string>(selectionHash);
  const hasGeneratedInitialSummary = useRef<boolean>(false);

  // Auto-generate initial summary when selection changes
  useEffect(() => {
    if (previousHashRef.current !== selectionHash) {
      setMessages([]);
      setShowInitialSummary(true);
      hasGeneratedInitialSummary.current = false;
      previousHashRef.current = selectionHash;
    }
  }, [selectionHash]);

  // Generate automatic overview on mount or selection change
  useEffect(() => {
    if (!hasGeneratedInitialSummary.current && totalLeads > 0) {
      hasGeneratedInitialSummary.current = true;
      
      // Automatically ask for overview
      const autoGenerateSummary = async () => {
        setIsLoading(true);
        try {
          // Ask for automatic overview
          const answerText = await onAskQuestion('Gerar resumo automático');
          const answerMsg: QAMessage = {
            id: `a-auto-${Date.now()}`,
            type: 'answer',
            content: answerText,
            timestamp: new Date(),
          };
          setMessages([answerMsg]);
          setShowInitialSummary(false);
        } catch (error) {
          console.error('Error generating automatic summary:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      autoGenerateSummary();
    }
  }, [totalLeads, onAskQuestion]);

  // Clear history when selection changes
  useEffect(() => {
    if (previousHashRef.current !== selectionHash) {
      setMessages([]);
      previousHashRef.current = selectionHash;
    }
  }, [selectionHash]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion.trim() || isLoading) return;

    const questionText = currentQuestion.trim();
    const questionMsg: QAMessage = {
      id: `q-${Date.now()}`,
      type: 'question',
      content: questionText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, questionMsg]);
    setCurrentQuestion('');
    setIsLoading(true);

    try {
      const answerText = await onAskQuestion(questionText);
      const answerMsg: QAMessage = {
        id: `a-${Date.now()}`,
        type: 'answer',
        content: answerText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, answerMsg]);
    } catch (error) {
      const errorMsg: QAMessage = {
        id: `a-${Date.now()}`,
        type: 'answer',
        content: 'Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };
  
  const handleClearChat = () => {
    if (confirm('Deseja limpar o histórico de perguntas?')) {
      setMessages([]);
      hasGeneratedInitialSummary.current = false;
    }
  };

  return (
    <div className="border-t pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h4 className="font-semibold text-sm">Perguntas & Respostas</h4>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearChat}
              className="h-7 w-7 p-0"
              title="Limpar histórico"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-7 w-7 p-0"
            title={isMinimized ? 'Expandir chat' : 'Minimizar chat'}
          >
            {isMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Context summary */}
          <div className="text-xs text-muted-foreground mb-3 p-2 bg-muted/50 rounded">
            <div><strong>Contexto:</strong> {totalLeads} leads | {densidade}</div>
            <div className="text-[10px] opacity-70 mt-1">Hash: {selectionHash.substring(0, 8)}</div>
          </div>

          {/* Messages history */}
          <ScrollArea className="h-[200px] mb-3 border rounded-md">
            <div ref={scrollRef} className="p-3 space-y-3">
              {messages.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Faça uma pergunta sobre a área selecionada
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.type === 'question' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        msg.type === 'question'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      <div className="text-[10px] opacity-70 mt-1">
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex items-start">
                  <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input form */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              value={currentQuestion}
              onChange={(e) => setCurrentQuestion(e.target.value)}
              placeholder="Ex: Qual a densidade de leads nessa área?"
              className="min-h-[60px] resize-none text-sm"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button
              type="submit"
              size="sm"
              disabled={!currentQuestion.trim() || isLoading}
              className="self-end"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>

          {/* Suggestions */}
          {messages.length === 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => setCurrentQuestion('Qual a densidade de leads nessa área?')}
              >
                Densidade
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => setCurrentQuestion('Quais são os principais projetos?')}
              >
                Projetos
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => setCurrentQuestion('Quais scouters são mais produtivos?')}
              >
                Scouters
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => setCurrentQuestion('Que recomendações você tem?')}
              >
                Recomendações
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

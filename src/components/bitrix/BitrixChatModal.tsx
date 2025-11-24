import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, RefreshCw } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useBitrixMessages } from "@/hooks/useBitrixMessages";
import { toast } from "sonner";

interface BitrixChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: number | null;
  chatId: string | null;
  leadId: string;
  contactName: string;
}

export function BitrixChatModal({
  open,
  onOpenChange,
  sessionId,
  chatId,
  leadId,
  contactName
}: BitrixChatModalProps) {
  const [inputMessage, setInputMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { messages, loading, sending, sendMessage, refreshMessages } = 
    useBitrixMessages(sessionId, chatId, leadId);

  const handleSend = async () => {
    if (!inputMessage.trim() || sending) return;
    
    try {
      await sendMessage(inputMessage);
      setInputMessage("");
      toast.success("Mensagem enviada!");
    } catch (error) {
      console.error("Erro ao enviar:", error);
      toast.error("Erro ao enviar mensagem");
    }
  };

  // Scroll automático para última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">💬</span>
              <div className="flex flex-col">
                <span>Chat com {contactName}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  Bitrix OpenLine • Sessão #{sessionId}
                </span>
              </div>
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshMessages}
              disabled={loading}
              title="Atualizar mensagens"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4">
            {loading && messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <div className="animate-pulse">Carregando mensagens...</div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <div className="text-4xl mb-2">💬</div>
                <div>Nenhuma mensagem ainda</div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.message_type === 'outgoing' 
                      ? 'justify-end' 
                      : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      msg.message_type === 'outgoing'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {msg.content}
                    </div>
                    <div className="text-xs opacity-70 mt-1">
                      {new Date(msg.created_at * 1000).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          <Input
            placeholder="Digite sua mensagem..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={sending}
            className="flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={sending || !inputMessage.trim()}
            size="icon"
            title="Enviar mensagem"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

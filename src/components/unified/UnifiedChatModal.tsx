import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, Send } from "lucide-react";
import { useBitrixMessages } from "@/hooks/useBitrixMessages";
import { useChatwootMessages } from "@/hooks/useChatwootMessages";
import { useToast } from "@/hooks/use-toast";
import { AgentChatMessage } from "./AgentChatMessage";
import { Badge } from "@/components/ui/badge";

interface UnifiedChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  
  // Bitrix data
  bitrixSessionId?: number | null;
  bitrixChatId?: string | null;
  bitrixLeadId?: string;
  
  // Chatwoot data
  chatwootConversationId?: number | null;
  
  // Common
  contactName: string;
}

export function UnifiedChatModal({
  open,
  onOpenChange,
  bitrixSessionId,
  bitrixChatId,
  bitrixLeadId,
  chatwootConversationId,
  contactName
}: UnifiedChatModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("bitrix");
  
  // Bitrix state
  const [bitrixInput, setBitrixInput] = useState("");
  const bitrixScrollRef = useRef<HTMLDivElement>(null);
  
  // Chatwoot state
  const [chatwootInput, setChatwootInput] = useState("");
  const chatwootScrollRef = useRef<HTMLDivElement>(null);
  
  // Hooks
  const {
    messages: bitrixMessages,
    loading: bitrixLoading,
    sending: bitrixSending,
    sendMessage: sendBitrixMessage,
    refreshMessages: refreshBitrix
  } = useBitrixMessages(bitrixSessionId, bitrixChatId, bitrixLeadId || "");
  
  const {
    messages: chatwootMessages,
    loading: chatwootLoading,
    sending: chatwootSending,
    sendMessage: sendChatwootMessage,
    fetchMessages: refreshChatwoot
  } = useChatwootMessages(chatwootConversationId);
  
  // Auto-scroll Bitrix
  useEffect(() => {
    if (bitrixScrollRef.current) {
      bitrixScrollRef.current.scrollTop = bitrixScrollRef.current.scrollHeight;
    }
  }, [bitrixMessages]);
  
  // Auto-scroll Chatwoot
  useEffect(() => {
    if (chatwootScrollRef.current) {
      chatwootScrollRef.current.scrollTop = chatwootScrollRef.current.scrollHeight;
    }
  }, [chatwootMessages]);
  
  // Bitrix send handler
  const handleBitrixSend = async () => {
    if (!bitrixInput.trim()) return;
    
    try {
      await sendBitrixMessage(bitrixInput);
      setBitrixInput("");
      toast({
        title: "✅ Mensagem enviada",
        description: "Mensagem enviada para o Bitrix com sucesso"
      });
    } catch (error) {
      toast({
        title: "❌ Erro ao enviar",
        description: "Não foi possível enviar a mensagem para o Bitrix",
        variant: "destructive"
      });
    }
  };
  
  // Chatwoot send handler
  const handleChatwootSend = async () => {
    if (!chatwootInput.trim()) return;
    
    try {
      await sendChatwootMessage(chatwootInput);
      setChatwootInput("");
      toast({
        title: "✅ Mensagem enviada",
        description: "Mensagem enviada para o Chatwoot com sucesso"
      });
    } catch (error) {
      toast({
        title: "❌ Erro ao enviar",
        description: "Não foi possível enviar a mensagem para o Chatwoot",
        variant: "destructive"
      });
    }
  };
  
  const hasBitrix = bitrixSessionId && bitrixChatId;
  const hasChatwoot = chatwootConversationId;
  
  // Set default tab based on what's available
  useEffect(() => {
    if (open) {
      if (hasBitrix && !hasChatwoot) {
        setActiveTab("bitrix");
      } else if (hasChatwoot && !hasBitrix) {
        setActiveTab("chatwoot");
      }
    }
  }, [open, hasBitrix, hasChatwoot]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Conversas - {contactName}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="mx-6 mt-4">
            {hasBitrix && (
              <TabsTrigger value="bitrix" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Bitrix
                <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-700">
                  {bitrixMessages.length}
                </Badge>
              </TabsTrigger>
            )}
            {hasChatwoot && (
              <TabsTrigger value="chatwoot" className="flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                Chatwoot
                <Badge variant="secondary" className="ml-1 bg-green-100 text-green-700">
                  {chatwootMessages.length}
                </Badge>
              </TabsTrigger>
            )}
          </TabsList>
          
          {hasBitrix && (
            <TabsContent value="bitrix" className="flex-1 flex flex-col px-6 pb-6 mt-4">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">
                  Sessão #{bitrixSessionId}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshBitrix()}
                  disabled={bitrixLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${bitrixLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>
              
              <div 
                ref={bitrixScrollRef}
                className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-muted/30 rounded-lg"
              >
                {bitrixMessages.map((msg) => (
                  <AgentChatMessage
                    key={msg.id}
                    role={msg.message_type === 'outgoing' ? 'assistant' : 'user'}
                    content={msg.content}
                    timestamp={new Date(msg.created_at * 1000)}
                  />
                ))}
              </div>
              
              <div className="flex gap-2">
                <Textarea
                  value={bitrixInput}
                  onChange={(e) => setBitrixInput(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="min-h-[60px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleBitrixSend();
                    }
                  }}
                />
                <Button
                  onClick={handleBitrixSend}
                  disabled={bitrixSending || !bitrixInput.trim()}
                  size="icon"
                  className="h-[60px] w-[60px]"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </TabsContent>
          )}
          
          {hasChatwoot && (
            <TabsContent value="chatwoot" className="flex-1 flex flex-col px-6 pb-6 mt-4">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">
                  Conversa #{chatwootConversationId}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshChatwoot()}
                  disabled={chatwootLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${chatwootLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>
              
              <div 
                ref={chatwootScrollRef}
                className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-muted/30 rounded-lg"
              >
                {chatwootMessages.map((msg) => (
                  <AgentChatMessage
                    key={msg.id}
                    role={msg.message_type === 0 ? 'user' : 'assistant'}
                    content={msg.content || ''}
                    timestamp={new Date(msg.created_at * 1000)}
                  />
                ))}
              </div>
              
              <div className="flex gap-2">
                <Textarea
                  value={chatwootInput}
                  onChange={(e) => setChatwootInput(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="min-h-[60px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleChatwootSend();
                    }
                  }}
                />
                <Button
                  onClick={handleChatwootSend}
                  disabled={chatwootSending || !chatwootInput.trim()}
                  size="icon"
                  className="h-[60px] w-[60px]"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

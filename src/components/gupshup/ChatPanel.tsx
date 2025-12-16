import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, RefreshCw, MessageSquare, ArrowLeft, Lock, Check, CheckCheck, Clock } from 'lucide-react';
import { useWhatsAppMessages, WhatsAppMessage } from '@/hooks/useWhatsAppMessages';
import { TemplateSelector } from './TemplateSelector';
import { WindowIndicator } from './WindowIndicator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useGupshupWindowStatus } from '@/hooks/useGupshupWindowStatus';
import { calculateWindowStatus, WindowStatus } from '@/lib/whatsappWindow';

interface ChatPanelProps {
  bitrixId?: string;
  phoneNumber?: string;
  conversationId?: number;
  contactName: string;
  onBack?: () => void;
  windowStatus?: WindowStatus;
}

// Componente de status de mensagem
function MessageStatus({ status }: { status: WhatsAppMessage['status'] }) {
  switch (status) {
    case 'sent':
      return <Check className="w-3 h-3 text-muted-foreground" />;
    case 'delivered':
      return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
    case 'read':
      return <CheckCheck className="w-3 h-3 text-blue-500" />;
    case 'failed':
      return <span className="text-xs text-red-500">Erro</span>;
    default:
      return null;
  }
}

// Componente de countdown para rate limit
function CooldownTimer({ getCooldownRemaining }: { getCooldownRemaining: () => number }) {
  const [remaining, setRemaining] = useState(getCooldownRemaining());
  
  useEffect(() => {
    const interval = setInterval(() => {
      const newRemaining = getCooldownRemaining();
      setRemaining(newRemaining);
      if (newRemaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [getCooldownRemaining]);
  
  if (remaining <= 0) return null;
  
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-700 dark:text-amber-400">
      <Clock className="w-4 h-4 animate-pulse" />
      <span className="text-sm font-medium">
        Aguarde {remaining}s para enviar novamente
      </span>
    </div>
  );
}

export function ChatPanel({
  bitrixId,
  phoneNumber,
  conversationId,
  contactName,
  onBack,
  windowStatus: propWindowStatus
}: ChatPanelProps) {
  const [messageInput, setMessageInput] = useState('');
  const [activeTab, setActiveTab] = useState('messages');
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const hasMarkedAsReadRef = useRef(false);
  const isSendingRef = useRef(false);

  // Log de diagnóstico
  console.log('[ChatPanelGupshup] Render', { bitrixId, phoneNumber, conversationId });

  const {
    messages,
    loading,
    sending,
    rateLimitedUntil,
    getCooldownRemaining,
    isInCooldown,
    fetchMessages,
    sendMessage,
    sendTemplate,
    markAsRead
  } = useWhatsAppMessages({ bitrixId, phoneNumber, conversationId });

  // Buscar status da janela APENAS via dados do Gupshup webhook
  const { 
    data: gupshupWindowStatus, 
    refetch: refetchWindowStatus 
  } = useGupshupWindowStatus({
    phoneNumber,
    bitrixId,
    enabled: !!(bitrixId || phoneNumber)
  });

  // Buscar leadId do chatwoot_contacts (apenas para navegação)
  const [leadId, setLeadId] = useState<number | null>(null);
  useEffect(() => {
    if (!bitrixId && !conversationId) return;
    
    const fetchLeadId = async () => {
      let query = supabase.from('chatwoot_contacts').select('bitrix_id');
      if (bitrixId) {
        query = query.eq('bitrix_id', bitrixId);
      } else if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      }
      const { data: contact } = await query.maybeSingle();
      if (contact?.bitrix_id) {
        setLeadId(parseInt(contact.bitrix_id));
      }
    };
    fetchLeadId();
  }, [bitrixId, conversationId]);

  // Usar o status da janela do Gupshup ou fallback para props/default
  const windowStatus = propWindowStatus || gupshupWindowStatus || calculateWindowStatus(null);
  const isWindowOpen = windowStatus.isOpen;
  
  // Verificar se está em cooldown
  const inCooldown = isInCooldown();

  const handleOpenInTelemarketing = () => {
    if (leadId) {
      navigate(`/telemarketing?lead=${leadId}`);
    }
  };

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

  // Marcar mensagens como lidas quando o painel estiver visível (apenas uma vez por sessão)
  useEffect(() => {
    if (hasMarkedAsReadRef.current) return;
    
    const unreadInboundMessages = messages.filter(
      msg => msg.direction === 'inbound' && msg.status !== 'read'
    );
    if (unreadInboundMessages.length > 0) {
      hasMarkedAsReadRef.current = true;
      markAsRead(unreadInboundMessages.map(m => m.id));
    }
  }, [messages]);

  // Se janela fechada, ir automaticamente para templates
  useEffect(() => {
    if (!isWindowOpen && activeTab === 'messages') {
      setActiveTab('templates');
    }
  }, [isWindowOpen, activeTab]);

  const handleSendMessage = async () => {
    // Proteção contra múltiplos cliques/envios
    if (isSendingRef.current) {
      console.log('[ChatPanelGupshup] handleSendMessage blocked - already sending');
      return;
    }
    if (!messageInput.trim() || !isWindowOpen || sending || inCooldown) {
      console.log('[ChatPanelGupshup] handleSendMessage blocked', { 
        hasMessage: !!messageInput.trim(), 
        isWindowOpen, 
        sending,
        inCooldown 
      });
      return;
    }
    
    isSendingRef.current = true;
    console.log('[ChatPanelGupshup] handleSendMessage starting');
    
    try {
      const success = await sendMessage(messageInput);
      if (success) {
        setMessageInput('');
      }
    } finally {
      isSendingRef.current = false;
      console.log('[ChatPanelGupshup] handleSendMessage finished');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendTemplateWrapper = async (params: { templateId: string; variables: string[] }) => {
    // Proteção contra múltiplos envios
    if (isSendingRef.current || inCooldown) {
      console.log('[ChatPanelGupshup] handleSendTemplate blocked', { isSending: isSendingRef.current, inCooldown });
      return false;
    }
    
    isSendingRef.current = true;
    console.log('[ChatPanelGupshup] handleSendTemplate starting', { templateId: params.templateId });
    
    try {
      return await sendTemplate(params);
    } finally {
      isSendingRef.current = false;
      console.log('[ChatPanelGupshup] handleSendTemplate finished');
    }
  };

  if (!bitrixId && !phoneNumber && !conversationId) {
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
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Header */}
      <div className="border-b p-4 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h2 className="text-lg font-semibold">{contactName}</h2>
              <p className="text-xs text-muted-foreground">
                {phoneNumber || `Lead #${bitrixId}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" 
              size="icon" 
              onClick={() => { fetchMessages(); refetchWindowStatus(); }} 
              disabled={loading} 
              title="Atualizar mensagens e status da janela"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Banner de status da janela */}
      <WindowIndicator status={windowStatus} variant="banner" />

      {/* Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="border-b px-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="messages">Mensagens</TabsTrigger>
            <TabsTrigger value="templates" className={!isWindowOpen ? 'animate-pulse bg-primary/10' : ''}>
              Templates
              {!isWindowOpen && <Lock className="w-3 h-3 ml-1" />}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="messages" className="flex-1 flex flex-col min-h-0 mt-0 overflow-hidden data-[state=active]:flex">
          <div className="relative flex-1 min-h-0">
            <ScrollArea className="absolute inset-0 p-4">
              <div className="space-y-4 pb-4" ref={scrollRef}>
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
                  messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        msg.direction === 'outbound' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        {/* Sender info */}
                        <div className="text-sm font-medium mb-1 flex items-center gap-2">
                          {msg.sender_name || (msg.direction === 'outbound' ? 'Você' : 'Cliente')}
                          {msg.sent_by && msg.direction === 'outbound' && (
                            <span className="text-xs opacity-70">
                              ({msg.sent_by === 'bitrix' ? 'Bitrix' : msg.sent_by === 'tabulador' ? 'TabuladorMax' : 'Operador'})
                            </span>
                          )}
                        </div>

                        {/* Template badge */}
                        {msg.message_type === 'template' && msg.template_name && (
                          <div className="text-xs bg-background/20 rounded px-2 py-0.5 mb-1 inline-block">
                            📋 Template: {msg.template_name}
                          </div>
                        )}

                        {/* Content */}
                        <div className="whitespace-pre-wrap">{msg.content}</div>

                        {/* Media */}
                        {msg.media_url && (
                          <div className="mt-2">
                            {msg.media_type === 'image' ? (
                              <img src={msg.media_url} alt="Imagem" className="max-w-full rounded" />
                            ) : msg.media_type === 'audio' ? (
                              <audio controls src={msg.media_url} className="max-w-full" />
                            ) : (
                              <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="text-xs underline">
                                📎 {msg.media_type || 'Arquivo'}
                              </a>
                            )}
                          </div>
                        )}

                        {/* Timestamp and status */}
                        <div className="flex items-center gap-1 text-xs opacity-70 mt-1">
                          {format(new Date(msg.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                          {msg.direction === 'outbound' && <MessageStatus status={msg.status} />}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Área de input - FIXA no rodapé */}
          <div className="flex-shrink-0 border-t p-3 bg-card space-y-2">
            {/* Cooldown Timer */}
            {inCooldown && (
              <CooldownTimer getCooldownRemaining={getCooldownRemaining} />
            )}
            
            {isWindowOpen ? (
              <>
                <div className="flex gap-2 items-end">
                  <Textarea
                    placeholder={inCooldown ? "Aguardando cooldown..." : "Digite sua mensagem... (Ctrl+Enter para enviar)"}
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={sending || inCooldown}
                    className={`min-h-[60px] max-h-[120px] resize-none ${inCooldown ? 'opacity-50' : ''}`}
                    rows={2}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={sending || !messageInput.trim() || inCooldown}
                    size="icon"
                    className="flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                {!inCooldown && (
                  <p className="text-xs text-muted-foreground">
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+Enter</kbd> para enviar
                  </p>
                )}
              </>
            ) : (
              <div className="text-center py-3 bg-red-500/5 rounded-lg border border-red-500/20">
                <Lock className="w-6 h-6 mx-auto mb-1 text-red-500" />
                <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">
                  Janela de 24h expirada
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  Envie um template para iniciar
                </p>
                <Button variant="default" size="sm" onClick={() => setActiveTab('templates')}>
                  Ir para Templates
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="flex-1 flex flex-col min-h-0 mt-0 overflow-hidden data-[state=active]:flex">
          {inCooldown && (
            <div className="px-4 pt-4">
              <CooldownTimer getCooldownRemaining={getCooldownRemaining} />
            </div>
          )}
          <TemplateSelector onSendTemplate={handleSendTemplateWrapper} disabled={sending || inCooldown} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

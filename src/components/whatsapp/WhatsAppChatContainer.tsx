import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Clock, ArrowRight } from 'lucide-react';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { useGupshupWindowStatus } from '@/hooks/useGupshupWindowStatus';
import { useSessionGuard } from '@/hooks/useSessionGuard';
import { calculateWindowStatus, WindowStatus } from '@/lib/whatsappWindow';
import { WhatsAppHeader } from './WhatsAppHeader';
import { WindowTimeCircle } from './WindowTimeCircle';
import { WhatsAppMessageList } from './WhatsAppMessageList';
import { WhatsAppInput, MediaType } from './WhatsAppInput';
import { TemplateSelector } from '@/components/gupshup/TemplateSelector';
import { WhatsAppFlowSelector } from './WhatsAppFlowSelector';
import { WhatsAppSendError } from './WhatsAppSendError';
import { SessionExpiredModal } from './SessionExpiredModal';
import { Button } from '@/components/ui/button';

interface WhatsAppChatContainerProps {
  bitrixId?: string;
  phoneNumber?: string;
  conversationId?: number;
  contactName: string;
  onClose?: () => void;
  variant?: 'modal' | 'fullscreen';
  commercialProjectId?: string;
  operatorBitrixId?: number;
}

export function WhatsAppChatContainer({
  bitrixId,
  phoneNumber,
  conversationId,
  contactName,
  onClose,
  variant = 'modal',
  commercialProjectId,
  operatorBitrixId
}: WhatsAppChatContainerProps) {
  const [activeTab, setActiveTab] = useState('messages');
  const hasMarkedAsReadRef = useRef(false);
  const isSendingRef = useRef(false);
  const [showReloginModal, setShowReloginModal] = useState(false);

  // Session guard para validação proativa
  const { showReloginModal: sessionExpiredModal, setShowReloginModal: setSessionExpiredModal } = useSessionGuard();

  const {
    messages,
    loading,
    sending,
    fetchMessages,
    sendMessage,
    sendMedia,
    sendLocation,
    sendTemplate,
    markAsRead,
    usingBitrixFallback,
    lastSendError,
    clearSendError,
    lastMessageContent
  } = useWhatsAppMessages({ bitrixId, phoneNumber, conversationId });

  const { data: gupshupWindowStatus, refetch: refetchWindowStatus } = useGupshupWindowStatus({
    phoneNumber,
    bitrixId,
    enabled: !!(bitrixId || phoneNumber)
  });

  const windowStatus: WindowStatus = gupshupWindowStatus || calculateWindowStatus(null);

  // Mark messages as read
  useEffect(() => {
    if (hasMarkedAsReadRef.current) return;
    const unread = messages.filter(m => m.direction === 'inbound' && m.status !== 'read');
    if (unread.length > 0) {
      hasMarkedAsReadRef.current = true;
      markAsRead(unread.map(m => m.id));
    }
  }, [messages, markAsRead]);

  // Detectar se a última mensagem falhou por janela expirada (erro 470)
  const lastMessage470Failed = useMemo(() => {
    // Pegar as últimas mensagens outbound
    const outboundMessages = messages.filter(m => m.direction === 'outbound');
    if (outboundMessages.length === 0) return false;
    
    const lastOutbound = outboundMessages[outboundMessages.length - 1];
    if (lastOutbound.status !== 'failed') return false;
    
    const metadata = lastOutbound.metadata;
    return metadata?.error_code === 470 || 
           metadata?.error_code === '470' || 
           metadata?.error_reason?.includes('24 hour');
  }, [messages]);

  // Listener para evento de mudança de aba (disparado pelo toast)
  useEffect(() => {
    const handleSwitchTab = (event: CustomEvent<string>) => {
      setActiveTab(event.detail);
    };
    
    window.addEventListener('whatsapp-switch-tab', handleSwitchTab as EventListener);
    return () => {
      window.removeEventListener('whatsapp-switch-tab', handleSwitchTab as EventListener);
    };
  }, []);

  const handleRefresh = () => {
    fetchMessages();
    refetchWindowStatus();
  };

  // Handler para reconectar sessão
  const handleReconnect = useCallback(() => {
    window.location.reload();
  }, []);

  // Handler para relogin (sessão completamente expirada)
  const handleRelogin = useCallback(() => {
    // Limpar dados de sessão
    localStorage.removeItem('telemarketing_auth_status');
    localStorage.removeItem('telemarketing_context');
    // Redirecionar para login
    window.location.href = '/portal-telemarketing';
  }, []);

  // Detectar erro de sessão expirada do hook
  useEffect(() => {
    if (lastSendError?.code === 'session_expired') {
      setShowReloginModal(true);
    }
  }, [lastSendError]);

  // Sincronizar com sessionGuard
  useEffect(() => {
    if (sessionExpiredModal) {
      setShowReloginModal(true);
    }
  }, [sessionExpiredModal]);

  // Handler para tentar novamente com a última mensagem
  const handleRetry = useCallback(async () => {
    if (lastMessageContent) {
      clearSendError();
      await sendMessage(lastMessageContent);
    }
  }, [lastMessageContent, clearSendError, sendMessage]);

  // Remover todas as restrições de isWindowOpen - deixar enviar sempre
  const handleSendMessage = async (content: string) => {
    if (isSendingRef.current || !content.trim() || sending) return false;
    isSendingRef.current = true;
    try {
      return await sendMessage(content);
    } finally {
      isSendingRef.current = false;
    }
  };

  const handleSendMedia = async (mediaUrl: string, mediaType: MediaType, caption?: string, filename?: string) => {
    if (isSendingRef.current || sending) return false;
    isSendingRef.current = true;
    try {
      return await sendMedia(mediaUrl, mediaType, caption, filename);
    } finally {
      isSendingRef.current = false;
    }
  };

  const handleSendTemplate = async (params: Parameters<typeof sendTemplate>[0]): Promise<boolean> => {
    if (isSendingRef.current) return false;
    isSendingRef.current = true;
    try {
      return await sendTemplate(params);
    } finally {
      isSendingRef.current = false;
    }
  };

  const handleSendLocation = async (latitude: number, longitude: number, name: string, address: string): Promise<boolean> => {
    if (isSendingRef.current || sending) return false;
    isSendingRef.current = true;
    try {
      return await sendLocation(latitude, longitude, name, address);
    } finally {
      isSendingRef.current = false;
    }
  };

  if (!bitrixId && !phoneNumber && !conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20 h-full">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Selecione uma conversa</h3>
          <p className="text-sm text-muted-foreground">Escolha uma conversa à esquerda para começar</p>
        </div>
      </div>
    );
  }

  // Calculate heights for absolute positioning
  const headerHeight = 73; // header
  const tabsHeight = 49; // tabs

  const topOffset = headerHeight + tabsHeight;

  return (
    <div className="relative h-full w-full bg-background overflow-hidden">
      {/* Header - Fixed at top */}
      <div className="absolute top-0 left-0 right-0 z-10">
        <WhatsAppHeader
          contactName={contactName}
          phoneNumber={phoneNumber}
          bitrixId={bitrixId}
          loading={loading}
          onRefresh={handleRefresh}
          onClose={onClose}
          rightContent={<WindowTimeCircle status={windowStatus} size="sm" />}
        />
      </div>

      {/* Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        {/* Tab list - Fixed position */}
        <div 
          className="absolute left-0 right-0 z-10 border-b px-4 bg-background"
          style={{ top: headerHeight }}
        >
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="messages">Mensagens</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="flows">Flows</TabsTrigger>
          </TabsList>
        </div>

        {/* Messages Tab Content */}
        <TabsContent 
          value="messages" 
          className="absolute left-0 right-0 overflow-hidden flex flex-col m-0 p-0"
          style={{ 
            top: topOffset,
            bottom: 0
          }}
        >
          {/* Message list - scrollable area */}
          <div className="flex-1 overflow-y-auto">
            <WhatsAppMessageList messages={messages} loading={loading} usingBitrixFallback={usingBitrixFallback} />
          </div>

          {/* Banner de janela expirada - quando última mensagem falhou com erro 470 */}
          {lastMessage470Failed && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mx-3 mb-2">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">
                    Janela de 24h expirada
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                    O cliente não respondeu nas últimas 24 horas. Use um template aprovado para retomar o contato.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="shrink-0 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                  onClick={() => setActiveTab('templates')}
                >
                  Ver Templates
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Error banner - acima do input */}
          {lastSendError && (
            <WhatsAppSendError
              error={lastSendError}
              onClear={clearSendError}
              onRetry={lastSendError.canRetry ? handleRetry : undefined}
              onReconnect={lastSendError.requiresReconnect ? handleReconnect : undefined}
            />
          )}

          {/* Input - Fixed at bottom - SEM restrição de janela */}
          <WhatsAppInput
            onSendText={handleSendMessage}
            onSendMedia={handleSendMedia}
            onSendLocation={handleSendLocation}
            disabled={sending}
            isWindowOpen={true}
            inCooldown={false}
            projectId={commercialProjectId}
            operatorBitrixId={operatorBitrixId}
            chatMessages={messages.map(m => ({
              direction: m.direction,
              content: m.content || '',
              sender_name: m.sender_name,
            }))}
          />
        </TabsContent>

        {/* Templates Tab Content */}
        <TabsContent 
          value="templates" 
          className="absolute left-0 right-0 overflow-hidden m-0 p-0"
          style={{ 
            top: topOffset,
            bottom: 0
          }}
        >
          <TemplateSelector onSendTemplate={handleSendTemplate} disabled={sending} />
        </TabsContent>

        {/* Flows Tab Content */}
        <TabsContent 
          value="flows" 
          className="absolute left-0 right-0 overflow-hidden m-0 p-0"
          style={{ 
            top: topOffset,
            bottom: 0
          }}
        >
          <WhatsAppFlowSelector 
            phoneNumber={phoneNumber} 
            bitrixId={bitrixId} 
            disabled={sending} 
          />
        </TabsContent>
      </Tabs>

      {/* Modal de sessão expirada */}
      <SessionExpiredModal 
        open={showReloginModal} 
        onRelogin={handleRelogin}
        onClose={() => setShowReloginModal(false)}
      />
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lock, MessageSquare } from 'lucide-react';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { useGupshupWindowStatus } from '@/hooks/useGupshupWindowStatus';
import { calculateWindowStatus, WindowStatus } from '@/lib/whatsappWindow';
import { WhatsAppHeader } from './WhatsAppHeader';
import { WhatsAppWindowBanner, CooldownTimer } from './WhatsAppWindowBanner';
import { WhatsAppMessageList } from './WhatsAppMessageList';
import { WhatsAppInput, MediaType } from './WhatsAppInput';
import { TemplateSelector } from '@/components/gupshup/TemplateSelector';

interface WhatsAppChatContainerProps {
  bitrixId?: string;
  phoneNumber?: string;
  conversationId?: number;
  contactName: string;
  onClose?: () => void;
  variant?: 'modal' | 'fullscreen';
  commercialProjectId?: string;
}

export function WhatsAppChatContainer({
  bitrixId,
  phoneNumber,
  conversationId,
  contactName,
  onClose,
  variant = 'modal',
  commercialProjectId
}: WhatsAppChatContainerProps) {
  const [activeTab, setActiveTab] = useState('messages');
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const hasMarkedAsReadRef = useRef(false);
  const isSendingRef = useRef(false);

  const {
    messages,
    loading,
    sending,
    getCooldownRemaining,
    isInCooldown,
    fetchMessages,
    sendMessage,
    sendMedia,
    sendTemplate,
    markAsRead,
    usingBitrixFallback
  } = useWhatsAppMessages({ bitrixId, phoneNumber, conversationId });

  const { data: gupshupWindowStatus, refetch: refetchWindowStatus } = useGupshupWindowStatus({
    phoneNumber,
    bitrixId,
    enabled: !!(bitrixId || phoneNumber)
  });

  const windowStatus: WindowStatus = gupshupWindowStatus || calculateWindowStatus(null);
  const isWindowOpen = windowStatus.isOpen;
  const inCooldown = isInCooldown();

  // Update cooldown timer
  useEffect(() => {
    if (!inCooldown) {
      setCooldownRemaining(0);
      return;
    }

    const updateCooldown = () => {
      const remaining = getCooldownRemaining();
      setCooldownRemaining(remaining);
      if (remaining <= 0) return;
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [inCooldown, getCooldownRemaining]);

  // Mark messages as read
  useEffect(() => {
    if (hasMarkedAsReadRef.current) return;
    const unread = messages.filter(m => m.direction === 'inbound' && m.status !== 'read');
    if (unread.length > 0) {
      hasMarkedAsReadRef.current = true;
      markAsRead(unread.map(m => m.id));
    }
  }, [messages, markAsRead]);

  // Note: removed auto-switch to templates when window is closed
  // Agent can now read messages even with window closed

  const handleRefresh = () => {
    fetchMessages();
    refetchWindowStatus();
  };

  const handleSendMessage = async (content: string) => {
    if (isSendingRef.current || !content.trim() || !isWindowOpen || sending || inCooldown) return false;
    isSendingRef.current = true;
    try {
      return await sendMessage(content);
    } finally {
      isSendingRef.current = false;
    }
  };

  const handleSendMedia = async (mediaUrl: string, mediaType: MediaType, caption?: string, filename?: string) => {
    if (isSendingRef.current || !isWindowOpen || sending || inCooldown) return false;
    isSendingRef.current = true;
    try {
      return await sendMedia(mediaUrl, mediaType, caption, filename);
    } finally {
      isSendingRef.current = false;
    }
  };

  const handleSendTemplate = async (params: Parameters<typeof sendTemplate>[0]): Promise<boolean> => {
    if (isSendingRef.current || inCooldown) return false;
    isSendingRef.current = true;
    try {
      return await sendTemplate(params);
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
  const bannerHeight = windowStatus.isOpen ? 36 : 36; // window banner
  const tabsHeight = 49; // tabs
  const inputHeight = 70; // base input height

  const topOffset = headerHeight + bannerHeight + tabsHeight;

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
        />
        <WhatsAppWindowBanner status={windowStatus} />
        {cooldownRemaining > 0 && <CooldownTimer remaining={cooldownRemaining} />}
      </div>

      {/* Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        {/* Tab list - Fixed position */}
        <div 
          className="absolute left-0 right-0 z-10 border-b px-4 bg-background"
          style={{ top: headerHeight + bannerHeight + (cooldownRemaining > 0 ? 36 : 0) }}
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="messages">Mensagens</TabsTrigger>
            <TabsTrigger value="templates" className={!isWindowOpen ? 'animate-pulse bg-primary/10' : ''}>
              Templates
              {!isWindowOpen && <Lock className="w-3 h-3 ml-1" />}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Messages Tab Content */}
        <TabsContent 
          value="messages" 
          className="absolute left-0 right-0 overflow-hidden flex flex-col m-0 p-0"
          style={{ 
            top: topOffset + (cooldownRemaining > 0 ? 36 : 0),
            bottom: 0
          }}
        >
          {/* Message list - scrollable area */}
          <div className="flex-1 overflow-y-auto">
            <WhatsAppMessageList messages={messages} loading={loading} usingBitrixFallback={usingBitrixFallback} />
          </div>

          {/* Closed window warning */}
          {!isWindowOpen && (
            <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/20">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Lock className="w-4 h-4 shrink-0" />
                <p className="text-sm flex-1">
                  Janela de 24h expirada. Use um{' '}
                  <button className="underline font-medium" onClick={() => setActiveTab('templates')}>
                    Template
                  </button>{' '}
                  para iniciar a conversa.
                </p>
              </div>
            </div>
          )}

          {/* Input - Fixed at bottom */}
          <WhatsAppInput
            onSendText={handleSendMessage}
            onSendMedia={handleSendMedia}
            disabled={sending || !isWindowOpen}
            isWindowOpen={isWindowOpen}
            inCooldown={inCooldown}
            projectId={commercialProjectId}
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
            top: topOffset + (cooldownRemaining > 0 ? 36 : 0),
            bottom: 0
          }}
        >
          <TemplateSelector onSendTemplate={handleSendTemplate} disabled={sending || inCooldown} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

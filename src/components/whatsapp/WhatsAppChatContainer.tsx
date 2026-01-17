import { useState, useRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare } from 'lucide-react';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { useGupshupWindowStatus } from '@/hooks/useGupshupWindowStatus';
import { calculateWindowStatus, WindowStatus } from '@/lib/whatsappWindow';
import { WhatsAppHeader } from './WhatsAppHeader';
import { WindowTimeCircle } from './WindowTimeCircle';
import { WhatsAppMessageList } from './WhatsAppMessageList';
import { WhatsAppInput, MediaType } from './WhatsAppInput';
import { TemplateSelector } from '@/components/gupshup/TemplateSelector';
import { WhatsAppFlowSelector } from './WhatsAppFlowSelector';

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
  const hasMarkedAsReadRef = useRef(false);
  const isSendingRef = useRef(false);

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
    usingBitrixFallback
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

  const handleRefresh = () => {
    fetchMessages();
    refetchWindowStatus();
  };

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

          {/* Input - Fixed at bottom - SEM restrição de janela */}
          <WhatsAppInput
            onSendText={handleSendMessage}
            onSendMedia={handleSendMedia}
            onSendLocation={handleSendLocation}
            disabled={sending}
            isWindowOpen={true}
            inCooldown={false}
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
    </div>
  );
}

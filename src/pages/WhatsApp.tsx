import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/layouts/MainLayout';
import { ConversationList } from '@/components/chatwoot/ConversationList';
import { ChatPanel } from '@/components/chatwoot/ChatPanel';
import { BulkTemplateModal } from '@/components/chatwoot/BulkTemplateModal';
import { useAgentConversations } from '@/hooks/useAgentConversations';
import { useIsMobile } from '@/hooks/use-mobile';

export default function WhatsApp() {
  const isMobile = useIsMobile();
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [showChatInMobile, setShowChatInMobile] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  
  const { conversations, selectedConversations, clearSelection } = useAgentConversations();

  const activeConversation = conversations.find(
    c => c.conversation_id === activeConversationId
  );

  const selectedConversationsList = conversations.filter(c =>
    selectedConversations.includes(c.conversation_id)
  );

  const handleBulkSendSuccess = () => {
    clearSelection();
  };

  const handleSelectConversation = (id: number) => {
    setActiveConversationId(id);
    if (isMobile) {
      setShowChatInMobile(true);
    }
  };

  const handleBackToList = () => {
    setShowChatInMobile(false);
  };

  const showList = !isMobile || !showChatInMobile;
  const showChat = !isMobile || showChatInMobile;

  return (
    <MainLayout
      title="WhatsApp"
      subtitle="Gerencie suas conversas e envie mensagens aos leads"
      hideSidebar
      actions={
        <Button
          onClick={() => setBulkModalOpen(true)}
          disabled={selectedConversations.length === 0}
          size={isMobile ? "sm" : "default"}
        >
          <Send className="h-4 w-4 mr-2" />
          {isMobile ? selectedConversations.length : `Enviar Template em Lote (${selectedConversations.length})`}
        </Button>
      }
    >
      <div className={`flex gap-4 ${isMobile ? 'h-[calc(100vh-12rem)]' : 'h-[calc(100vh-16rem)]'}`}>
        {/* Lista de Conversas */}
        {showList && (
          <div className={isMobile ? "w-full" : "w-96 flex-shrink-0"}>
            <ConversationList
              onSelectConversation={handleSelectConversation}
              activeConversationId={activeConversationId}
            />
          </div>
        )}

        {/* Painel de Chat */}
        {showChat && (
          <div className={`border rounded-lg overflow-hidden flex flex-col ${isMobile ? 'w-full' : 'flex-1'}`}>
            <ChatPanel
              conversationId={activeConversationId}
              contactName={activeConversation?.name || 'Selecione uma conversa'}
              onBack={isMobile ? handleBackToList : undefined}
            />
          </div>
        )}
      </div>

      {/* Modal de Envio em Lote */}
      <BulkTemplateModal
        open={bulkModalOpen}
        onOpenChange={setBulkModalOpen}
        selectedConversations={selectedConversationsList}
        onSuccess={handleBulkSendSuccess}
      />
    </MainLayout>
  );
}

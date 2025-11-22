import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConversationList } from '@/components/chatwoot/ConversationList';
import { ChatPanel } from '@/components/chatwoot/ChatPanel';
import { BulkTemplateModal } from '@/components/chatwoot/BulkTemplateModal';
import { useAgentConversations } from '@/hooks/useAgentConversations';
import { useIsMobile } from '@/hooks/use-mobile';

export default function WhatsApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [showChatInMobile, setShowChatInMobile] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  
  const { conversations, selectedConversations, clearSelection } = useAgentConversations();

  // Detectar contexto de origem (telemarketing ou scouter)
  const from = (location.state as any)?.from || 'telemarketing';
  const backUrl = from === 'scouter' ? '/scouter' : '/lead';
  const pageTitle = from === 'scouter' ? 'WhatsApp - Gestão Scouter' : 'WhatsApp - Telemarketing';

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className={`container mx-auto px-4 flex items-center justify-between ${isMobile ? 'py-2' : 'py-4'}`}>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(backUrl)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{pageTitle}</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie suas conversas e envie mensagens aos leads
              </p>
            </div>
          </div>
          
          <Button
            onClick={() => setBulkModalOpen(true)}
            disabled={selectedConversations.length === 0}
            size={isMobile ? "sm" : "default"}
          >
            <Send className="h-4 w-4 mr-2" />
            {isMobile ? selectedConversations.length : `Enviar Template em Lote (${selectedConversations.length})`}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className={`flex gap-4 ${isMobile ? 'h-[calc(100vh-8rem)]' : 'h-[calc(100vh-12rem)]'}`}>
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
      </div>

      {/* Modal de Envio em Lote */}
      <BulkTemplateModal
        open={bulkModalOpen}
        onOpenChange={setBulkModalOpen}
        selectedConversations={selectedConversationsList}
        onSuccess={handleBulkSendSuccess}
      />
    </div>
  );
}

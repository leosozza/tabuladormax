import { useState } from 'react';
import { GestaoPageLayout } from '@/components/layouts/GestaoPageLayout';
import { Button } from '@/components/ui/button';
import { ConversationList } from '@/components/chatwoot/ConversationList';
import { ChatPanel } from '@/components/chatwoot/ChatPanel';
import { BulkTemplateModal } from '@/components/chatwoot/BulkTemplateModal';
import { useAgentConversations } from '@/hooks/useAgentConversations';
import { Send } from 'lucide-react';

export default function Conversas() {
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
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

  return (
    <GestaoPageLayout
      title="Minhas Conversas"
      description="Gerencie suas conversas e envie mensagens aos leads"
      actions={
        <Button
          onClick={() => setBulkModalOpen(true)}
          disabled={selectedConversations.length === 0}
        >
          <Send className="h-4 w-4 mr-2" />
          Enviar Template em Lote ({selectedConversations.length})
        </Button>
      }
    >
      <div className="h-[calc(100vh-12rem)] flex gap-4">
        {/* Lista de Conversas */}
        <div className="w-96 flex-shrink-0">
          <ConversationList
            onSelectConversation={setActiveConversationId}
            activeConversationId={activeConversationId}
          />
        </div>

        {/* Painel de Chat */}
        <div className="flex-1 border rounded-lg overflow-hidden">
          <ChatPanel
            conversationId={activeConversationId}
            contactName={activeConversation?.name || 'Selecione uma conversa'}
          />
        </div>
      </div>

      {/* Modal de Envio em Lote */}
      <BulkTemplateModal
        open={bulkModalOpen}
        onOpenChange={setBulkModalOpen}
        selectedConversations={selectedConversationsList}
        onSuccess={handleBulkSendSuccess}
      />
    </GestaoPageLayout>
  );
}

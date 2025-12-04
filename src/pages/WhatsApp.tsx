import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Menu, Phone, LayoutDashboard, List, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/layouts/MainLayout';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConversationList } from '@/components/chatwoot/ConversationList';
import { ConversationsKanban } from '@/components/chatwoot/ConversationsKanban';
import { ChatPanel } from '@/components/chatwoot/ChatPanel';
import { BulkTemplateModal } from '@/components/chatwoot/BulkTemplateModal';
import { useAgentConversations } from '@/hooks/useAgentConversations';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type ViewMode = 'list' | 'kanban';

export default function WhatsApp() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [showChatInMobile, setShowChatInMobile] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('whatsapp-view-mode');
    return (saved as ViewMode) || 'list';
  });
  
  const { conversations, selectedConversations, clearSelection } = useAgentConversations();

  useEffect(() => {
    localStorage.setItem('whatsapp-view-mode', viewMode);
  }, [viewMode]);

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
    <TooltipProvider>
      <MainLayout
        title="WhatsApp"
        subtitle="Gerencie suas conversas"
        actions={
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            {!isMobile && (
              <div className="flex items-center border rounded-md">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="icon"
                      className="h-8 w-8 rounded-r-none"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Lista</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                      size="icon"
                      className="h-8 w-8 rounded-l-none"
                      onClick={() => setViewMode('kanban')}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Kanban</TooltipContent>
                </Tooltip>
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size={isMobile ? "sm" : "default"}>
                  <Menu className="h-4 w-4" />
                  {!isMobile && <span className="ml-2">Menu</span>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background z-[600]">
                <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Tabulador
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/telemarketing')}>
                  <Phone className="h-4 w-4 mr-2" />
                  Telemarketing
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={() => setBulkModalOpen(true)}
              disabled={selectedConversations.length === 0}
              size={isMobile ? "sm" : "default"}
            >
              <Send className="h-4 w-4 mr-2" />
              {isMobile ? selectedConversations.length : `Enviar Template (${selectedConversations.length})`}
            </Button>
          </div>
        }
      >
        <div className={`flex gap-2 ${isMobile ? 'h-[calc(100vh-10rem)]' : 'h-[calc(100vh-9rem)]'}`}>
          {/* Lista ou Kanban de Conversas */}
          {showList && (
            <div className={isMobile ? "w-full" : viewMode === 'kanban' ? "flex-1" : "w-96 flex-shrink-0"}>
              {viewMode === 'list' ? (
                <ConversationList
                  onSelectConversation={handleSelectConversation}
                  activeConversationId={activeConversationId}
                />
              ) : (
                <ConversationsKanban
                  onSelectConversation={handleSelectConversation}
                  activeConversationId={activeConversationId}
                />
              )}
            </div>
          )}

          {/* Painel de Chat */}
          {showChat && viewMode === 'list' && (
            <div className={`border rounded-lg overflow-hidden flex flex-col ${isMobile ? 'w-full' : 'flex-1'}`}>
              <ChatPanel
                conversationId={activeConversationId}
                contactName={activeConversation?.lead_name || 'Selecione uma conversa'}
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
    </TooltipProvider>
  );
}

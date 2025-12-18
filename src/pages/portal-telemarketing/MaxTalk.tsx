import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMaxTalkConversations } from '@/hooks/useMaxTalkConversations';
import { useMaxTalkMessages } from '@/hooks/useMaxTalkMessages';
import { useMaxTalkUsers } from '@/hooks/useMaxTalkUsers';
import { MaxTalkSidebar } from '@/components/maxtalk/MaxTalkSidebar';
import { MaxTalkChatArea } from '@/components/maxtalk/MaxTalkChatArea';
import { MaxTalkNewChatDialog } from '@/components/maxtalk/MaxTalkNewChatDialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowLeft, Home, Phone, MessageCircle } from 'lucide-react';

export default function MaxTalk() {
  const navigate = useNavigate();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);

  const { 
    conversations, 
    loading: loadingConversations,
    createPrivateConversation,
    createGroupConversation,
    markAsRead
  } = useMaxTalkConversations();

  const { 
    messages, 
    loading: loadingMessages,
    sendMessage,
    deleteMessage
  } = useMaxTalkMessages(selectedConversationId);

  const { users, loading: loadingUsers } = useMaxTalkUsers();

  const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;

  // Mark as read when selecting conversation
  useEffect(() => {
    if (selectedConversationId) {
      markAsRead(selectedConversationId);
    }
  }, [selectedConversationId, messages.length, markAsRead]);

  const handleCreatePrivate = async (userId: string) => {
    const convId = await createPrivateConversation(userId);
    if (convId) {
      setSelectedConversationId(convId);
    }
  };

  const handleCreateGroup = async (name: string, userIds: string[]) => {
    const convId = await createGroupConversation(name, userIds);
    if (convId) {
      setSelectedConversationId(convId);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header com navegação */}
      <div className="h-14 border-b border-border flex items-center px-4 gap-4 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => navigate('/portal-telemarketing')}>
              <Home className="w-4 h-4 mr-2" />
              Portal Principal
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/portal-telemarketing/tabulador')}>
              <Phone className="w-4 h-4 mr-2" />
              Tabulador
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h1 className="font-semibold">MaxTalk</h1>
        </div>
      </div>

      {/* Área principal do chat */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 shrink-0">
          <MaxTalkSidebar
            conversations={conversations}
            selectedId={selectedConversationId}
            onSelect={setSelectedConversationId}
            onNewChat={() => setShowNewChat(true)}
            loading={loadingConversations}
          />
        </div>

        {/* Chat Area */}
        <MaxTalkChatArea
          conversation={selectedConversation}
          messages={messages}
          loading={loadingMessages}
          onSendMessage={sendMessage}
          onDeleteMessage={deleteMessage}
        />
      </div>

      {/* New Chat Dialog */}
      <MaxTalkNewChatDialog
        open={showNewChat}
        onClose={() => setShowNewChat(false)}
        users={users}
        loading={loadingUsers}
        onCreatePrivate={handleCreatePrivate}
        onCreateGroup={handleCreateGroup}
      />
    </div>
  );
}
